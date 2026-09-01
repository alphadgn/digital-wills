// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721Minimal {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC1155Minimal {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
}

/**
 * @title InheritanceVault
 * @notice A 2-of-3 multi-signature inheritance vault holding ETH, ERC-20, ERC-721 and ERC-1155
 *         assets for a donor, releasing them to beneficiaries only under authorized conditions.
 *
 * @dev Governance model - three signers, two approvals required to release:
 *
 *        DONOR       - owns the assets, retains control while alive
 *        BENEFICIARY - designated recipient, approves by initiating a claim
 *        ORACLE      - independent death verification authority
 *
 *      No verified death, no inheritance release. A beneficiary-initiated claim FREEZES the vault
 *      and opens a donor response window. While alive the donor may cancel an improper claim,
 *      which clears every approval and unfreezes the vault - cancellation is itself proof of life.
 *      If the oracle verifies death, its approval joins the beneficiary's and the 2-of-3 threshold
 *      is met. A donor may also approve directly (DONOR + BENEFICIARY) to release voluntarily.
 *
 *      Inactivity is tracked as liveness telemetry only. It is not a release precondition -
 *      eligibility is determined by verification, authorization by the 2-of-3 threshold.
 */
contract InheritanceVault is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721HolderUpgradeable,
    ERC1155HolderUpgradeable
{
    struct Beneficiary {
        address wallet;
        uint256 allocationBps; // basis points (10000 = 100%)
        bool hasClaimed;
    }

    /// @notice The three vault signers.
    enum Signer { DONOR, BENEFICIARY, ORACLE }

    /// @notice Approvals required out of the three signers.
    uint256 public constant REQUIRED_APPROVALS = 2;

    /// @notice Default period the donor has to cancel a claim before the oracle decision stands.
    uint256 public constant DEFAULT_DONOR_WINDOW = 7 days;

    // -- Storage (append-only: this is a UUPS proxy) --

    address public deathOracle;
    uint256 public inactivityPeriod;
    uint256 public lastActivity;
    bool public isTriggered;

    Beneficiary[] public beneficiaries;
    uint256 public totalAllocatedBps;

    /// @notice Independent death-verification authority - the third signer.
    address public oracleAuthority;
    /// @notice ClaimManager permitted to relay beneficiary and oracle approvals.
    address public claimManager;

    /// @notice True while a claim is pending or authorized. Blocks donor reconfiguration.
    bool public frozen;
    /// @notice Beneficiary that initiated the pending claim.
    address public claimant;
    /// @notice Deadline until which the donor may cancel the pending claim.
    uint256 public donorWindowEnds;
    /// @notice Donor cancellation window length.
    uint256 public donorWindow;

    /// @notice Approval state for each of the three signers.
    mapping(Signer => bool) public approved;

    /// @notice ETH balance snapshotted when the release threshold was met.
    uint256 public releasableEth;
    /// @notice True once the 2-of-3 threshold has been met and the snapshot taken.
    bool public released;

    // -- Events --

    event Deposited(address indexed from, uint256 amount);
    event BeneficiaryAdded(address indexed wallet, uint256 allocationBps);
    event BeneficiaryRemoved(address indexed wallet);
    event VaultTriggered(uint256 timestamp);
    event Claimed(address indexed beneficiary, uint256 amount);
    event ActivityRecorded(uint256 timestamp);

    event VaultFrozen(address indexed claimant, uint256 donorWindowEnds);
    event VaultUnfrozen(uint256 timestamp);
    event ApprovalRecorded(Signer indexed signer, uint256 approvalCount);
    event ApprovalRevoked(Signer indexed signer);
    event ClaimCancelledByDonor(address indexed claimant, uint256 timestamp);
    event ReleaseAuthorized(uint256 ethSnapshot, uint256 timestamp);
    event OracleAuthorityUpdated(address indexed newAuthority);
    event ClaimManagerUpdated(address indexed newClaimManager);
    event ERC20Released(address indexed beneficiary, address indexed token, uint256 amount);
    event ERC721Released(address indexed beneficiary, address indexed token, uint256 tokenId);
    event ERC1155Released(address indexed beneficiary, address indexed token, uint256 id, uint256 amount);

    // -- Modifiers --

    modifier onlyOracle() {
        require(msg.sender == deathOracle, "Only oracle");
        _;
    }

    modifier notTriggered() {
        require(!isTriggered, "Vault already triggered");
        _;
    }

    /// @dev Donor may only reconfigure the will while no claim is pending or authorized.
    modifier whileDonorInControl() {
        require(!frozen, "Vault frozen: claim pending");
        require(!released, "Release authorized");
        _;
    }

    modifier onlyClaimManager() {
        require(claimManager != address(0) && msg.sender == claimManager, "Only claim manager");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param _claimManager ClaimManager permitted to freeze this vault for a claim. Wired here
     *        rather than left to the donor: `setClaimManager` is `onlyOwner`, so a factory
     *        cannot supply it after deployment, and a vault without one can never be frozen
     *        by a claim nor cancelled by its donor. Pass address(0) to leave it unwired.
     * @param _oracleAuthority Death verification authority. Falls back to `_deathOracle`.
     */
    function initialize(
        address _owner,
        address _deathOracle,
        uint256 _inactivityPeriodDays,
        address _claimManager,
        address _oracleAuthority
    ) external initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __ERC721Holder_init();
        __ERC1155Holder_init();

        deathOracle = _deathOracle;
        // The deploying oracle doubles as the initial verification authority until reassigned.
        oracleAuthority = _oracleAuthority == address(0) ? _deathOracle : _oracleAuthority;
        claimManager = _claimManager;
        inactivityPeriod = _inactivityPeriodDays * 1 days;
        lastActivity = block.timestamp;
        donorWindow = DEFAULT_DONOR_WINDOW;

        if (_claimManager != address(0)) emit ClaimManagerUpdated(_claimManager);
    }

    receive() external payable {
        lastActivity = block.timestamp;
        emit Deposited(msg.sender, msg.value);
        emit ActivityRecorded(block.timestamp);
    }

    // -- Donor: will management while alive --

    function recordActivity() external onlyOwner notTriggered {
        lastActivity = block.timestamp;
        emit ActivityRecorded(block.timestamp);
    }

    function setOracleAuthority(address _authority) external onlyOwner whileDonorInControl {
        require(_authority != address(0), "Invalid authority");
        oracleAuthority = _authority;
        emit OracleAuthorityUpdated(_authority);
    }

    function setClaimManager(address _claimManager) external onlyOwner whileDonorInControl {
        claimManager = _claimManager;
        emit ClaimManagerUpdated(_claimManager);
    }

    function setDonorWindow(uint256 _seconds) external onlyOwner whileDonorInControl {
        require(_seconds > 0, "Window must be > 0");
        donorWindow = _seconds;
    }

    function addBeneficiary(address _wallet, uint256 _allocationBps)
        external
        onlyOwner
        notTriggered
        whileDonorInControl
    {
        require(_wallet != address(0), "Invalid beneficiary");
        require(_allocationBps > 0, "Allocation must be > 0");
        require(totalAllocatedBps + _allocationBps <= 10000, "Exceeds 100%");

        beneficiaries.push(Beneficiary({
            wallet: _wallet,
            allocationBps: _allocationBps,
            hasClaimed: false
        }));
        totalAllocatedBps += _allocationBps;

        emit BeneficiaryAdded(_wallet, _allocationBps);
    }

    function removeBeneficiary(uint256 _index)
        external
        onlyOwner
        notTriggered
        whileDonorInControl
    {
        require(_index < beneficiaries.length, "Invalid index");

        address wallet = beneficiaries[_index].wallet;
        totalAllocatedBps -= beneficiaries[_index].allocationBps;

        beneficiaries[_index] = beneficiaries[beneficiaries.length - 1];
        beneficiaries.pop();

        emit BeneficiaryRemoved(wallet);
    }

    // -- Claim lifecycle: freeze, approve, cancel --

    /**
     * @notice Freeze the vault for a beneficiary-initiated claim and record their approval.
     * @dev Called by ClaimManager when a registered beneficiary initiates a claim. Opens the
     *      donor cancellation window.
     */
    function freezeForClaim(address _claimant) external onlyClaimManager {
        require(!frozen, "Already frozen");
        require(!released, "Release authorized");
        require(_isBeneficiary(_claimant), "Not a beneficiary");

        frozen = true;
        claimant = _claimant;
        donorWindowEnds = block.timestamp + donorWindow;

        _recordApproval(Signer.BENEFICIARY);

        emit VaultFrozen(_claimant, donorWindowEnds);
    }

    /**
     * @notice Oracle authority records its verified death decision on-chain.
     * @dev A `deceased == false` decision denies the claim and unfreezes the vault.
     */
    function recordOracleDecision(bool deceased) external {
        require(
            msg.sender == oracleAuthority || (claimManager != address(0) && msg.sender == claimManager),
            "Only oracle authority"
        );
        require(frozen, "No pending claim");

        if (deceased) {
            _recordApproval(Signer.ORACLE);
        } else {
            _clearClaim();
        }
    }

    /**
     * @notice Donor approves release voluntarily, without waiting for a death verification.
     * @dev DONOR + BENEFICIARY satisfies the 2-of-3 threshold.
     */
    function donorApprove() external onlyOwner {
        require(frozen, "No pending claim");
        _recordApproval(Signer.DONOR);
    }

    /**
     * @notice Donor cancels an improper claim while alive.
     * @dev Clears every approval, unfreezes the vault and records proof of life. Only available
     *      before the release threshold is met - once 2-of-3 authorization stands, it is final.
     */
    function donorCancel() external onlyOwner {
        require(frozen, "No pending claim");
        require(!released, "Release already authorized");

        address cancelled = claimant;
        _clearClaim();

        lastActivity = block.timestamp;
        emit ClaimCancelledByDonor(cancelled, block.timestamp);
        emit ActivityRecorded(block.timestamp);
    }

    /**
     * @notice Oracle death assertion via the DeathOracle contract.
     * @dev Retained for DeathOracle compatibility. Records the ORACLE approval; it does not by
     *      itself release assets - the 2-of-3 threshold still governs.
     */
    function triggerVault() external onlyOracle notTriggered {
        isTriggered = true;

        if (!frozen) {
            frozen = true;
            donorWindowEnds = block.timestamp + donorWindow;
            emit VaultFrozen(address(0), donorWindowEnds);
        }
        _recordApproval(Signer.ORACLE);

        emit VaultTriggered(block.timestamp);
    }

    // -- Release --

    /**
     * @notice Beneficiary withdraws their allocation once the vault is authorized to release.
     */
    function claim(uint256 _index) external nonReentrant {
        require(released, "Release not authorized");
        require(_index < beneficiaries.length, "Invalid index");

        Beneficiary storage b = beneficiaries[_index];
        require(msg.sender == b.wallet, "Not beneficiary");
        require(!b.hasClaimed, "Already claimed");

        // Checks-Effects-Interactions
        b.hasClaimed = true;
        uint256 amount = (releasableEth * b.allocationBps) / totalAllocatedBps;

        if (amount > 0) {
            (bool success, ) = b.wallet.call{value: amount}("");
            require(success, "Transfer failed");
        }

        emit Claimed(b.wallet, amount);
    }

    /**
     * @notice Release a beneficiary's ETH allocation, driven by ClaimManager.
     * @dev Push counterpart to `claim`, so an executed claim actually moves assets.
     */
    function releaseTo(address _beneficiary) external onlyClaimManager nonReentrant returns (uint256) {
        require(released, "Release not authorized");

        uint256 index = _beneficiaryIndex(_beneficiary);
        Beneficiary storage b = beneficiaries[index];
        require(!b.hasClaimed, "Already claimed");

        b.hasClaimed = true;
        uint256 amount = (releasableEth * b.allocationBps) / totalAllocatedBps;

        if (amount > 0) {
            (bool success, ) = b.wallet.call{value: amount}("");
            require(success, "Transfer failed");
        }

        emit Claimed(b.wallet, amount);
        return amount;
    }

    /**
     * @notice Release ERC-20 tokens to a beneficiary after authorization.
     */
    function releaseERC20(address _beneficiary, address _token, uint256 _amount)
        external
        nonReentrant
    {
        _requireReleaseCaller();
        require(_isBeneficiary(_beneficiary), "Not a beneficiary");
        require(IERC20Minimal(_token).transfer(_beneficiary, _amount), "ERC20 transfer failed");
        emit ERC20Released(_beneficiary, _token, _amount);
    }

    /**
     * @notice Release an ERC-721 token to a beneficiary after authorization.
     */
    function releaseERC721(address _beneficiary, address _token, uint256 _tokenId)
        external
        nonReentrant
    {
        _requireReleaseCaller();
        require(_isBeneficiary(_beneficiary), "Not a beneficiary");
        IERC721Minimal(_token).safeTransferFrom(address(this), _beneficiary, _tokenId);
        emit ERC721Released(_beneficiary, _token, _tokenId);
    }

    /**
     * @notice Release an ERC-1155 balance to a beneficiary after authorization.
     */
    function releaseERC1155(address _beneficiary, address _token, uint256 _id, uint256 _amount)
        external
        nonReentrant
    {
        _requireReleaseCaller();
        require(_isBeneficiary(_beneficiary), "Not a beneficiary");
        IERC1155Minimal(_token).safeTransferFrom(address(this), _beneficiary, _id, _amount, "");
        emit ERC1155Released(_beneficiary, _token, _id, _amount);
    }

    // -- Views --

    function approvalCount() public view returns (uint256 count) {
        if (approved[Signer.DONOR]) count++;
        if (approved[Signer.BENEFICIARY]) count++;
        if (approved[Signer.ORACLE]) count++;
    }

    function isReleaseAuthorized() public view returns (bool) {
        return approvalCount() >= REQUIRED_APPROVALS;
    }

    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    function donorWindowOpen() external view returns (bool) {
        return frozen && !released && block.timestamp < donorWindowEnds;
    }

    // -- Internals --

    function _recordApproval(Signer _signer) internal {
        if (approved[_signer]) return;
        approved[_signer] = true;
        emit ApprovalRecorded(_signer, approvalCount());

        if (!released && isReleaseAuthorized()) {
            released = true;
            releasableEth = address(this).balance;
            emit ReleaseAuthorized(releasableEth, block.timestamp);
        }
    }

    /// @dev Clear a pending claim and every approval, returning control to the donor.
    function _clearClaim() internal {
        require(!released, "Release already authorized");

        if (approved[Signer.DONOR]) { approved[Signer.DONOR] = false; emit ApprovalRevoked(Signer.DONOR); }
        if (approved[Signer.BENEFICIARY]) { approved[Signer.BENEFICIARY] = false; emit ApprovalRevoked(Signer.BENEFICIARY); }
        if (approved[Signer.ORACLE]) { approved[Signer.ORACLE] = false; emit ApprovalRevoked(Signer.ORACLE); }

        frozen = false;
        claimant = address(0);
        donorWindowEnds = 0;
        isTriggered = false;

        emit VaultUnfrozen(block.timestamp);
    }

    function _requireReleaseCaller() internal view {
        require(released, "Release not authorized");
        require(
            msg.sender == claimManager || msg.sender == owner() || msg.sender == claimant,
            "Not authorized to release"
        );
    }

    function _isBeneficiary(address _wallet) internal view returns (bool) {
        uint256 len = beneficiaries.length;
        for (uint256 i = 0; i < len; i++) {
            if (beneficiaries[i].wallet == _wallet) return true;
        }
        return false;
    }

    function _beneficiaryIndex(address _wallet) internal view returns (uint256) {
        uint256 len = beneficiaries.length;
        for (uint256 i = 0; i < len; i++) {
            if (beneficiaries[i].wallet == _wallet) return i;
        }
        revert("Not a beneficiary");
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
