// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IInheritanceVault {
    function isTriggered() external view returns (bool);
    function beneficiaries(uint256) external view returns (address wallet, uint256 allocationBps, bool hasClaimed);
    function getBeneficiaryCount() external view returns (uint256);
    function freezeForClaim(address claimant) external;
    function recordOracleDecision(bool deceased) external;
    function releaseTo(address beneficiary) external returns (uint256);
    function isReleaseAuthorized() external view returns (bool);
    function frozen() external view returns (bool);
    function released() external view returns (bool);
    function owner() external view returns (address);
}

interface IOracleGateway {
    function isVerified(address vault) external view returns (bool);
    function getConfidence(address vault) external view returns (uint256);
}

/**
 * @title ClaimManager
 * @notice Manages the claim lifecycle: initiation, oracle verification, donor cancellation
 *         and execution.
 * @dev Enforces the dual-vote rule (beneficiaryVote AND oracleVote) at the claim layer, and
 *      relays both votes to the vault, whose 2-of-3 signer threshold is the binding
 *      authorization. Initiating a claim freezes the vault and opens the donor cancellation
 *      window; a donor cancellation denies the claim outright.
 */
contract ClaimManager is AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    enum ClaimStatus { INITIATED, VERIFICATION_PENDING, VERIFIED, DENIED, EXECUTED, CANCELLED }

    struct Claim {
        address vault;
        address beneficiary;
        ClaimStatus status;
        bool beneficiaryVote;
        bool oracleVote;
        uint256 oracleConfidence; // scaled by 1e4 (9900 = 0.99)
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 public constant MIN_CONFIDENCE = 9900; // 0.99 * 10000

    mapping(uint256 => Claim) public claims;
    uint256 public claimCount;

    // vault => beneficiary => claimId (prevent duplicates)
    mapping(address => mapping(address => uint256)) public activeClaim;

    IOracleGateway public oracleGateway;

    event ClaimInitiated(uint256 indexed claimId, address indexed vault, address indexed beneficiary);
    event ClaimVerified(uint256 indexed claimId, uint256 confidence);
    event ClaimDenied(uint256 indexed claimId, uint256 confidence);
    event ClaimExecuted(uint256 indexed claimId);
    event ClaimCancelled(uint256 indexed claimId, address indexed donor);
    event AssetsReleased(uint256 indexed claimId, address indexed beneficiary, uint256 ethAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin, address _oracleGateway) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        oracleGateway = IOracleGateway(_oracleGateway);
    }

    /**
     * @notice Beneficiary initiates a claim against a vault.
     * @dev Freezes the vault and records the beneficiary approval, opening the donor
     *      cancellation window.
     */
    function initiateClaim(address vault) external returns (uint256) {
        require(activeClaim[vault][msg.sender] == 0, "Active claim exists");

        // Verify caller is a registered beneficiary
        IInheritanceVault v = IInheritanceVault(vault);
        bool isBeneficiary = false;
        uint256 count = v.getBeneficiaryCount();
        for (uint256 i = 0; i < count; i++) {
            (address w,,) = v.beneficiaries(i);
            if (w == msg.sender) { isBeneficiary = true; break; }
        }
        require(isBeneficiary, "Not a beneficiary");

        claimCount++;
        claims[claimCount] = Claim({
            vault: vault,
            beneficiary: msg.sender,
            status: ClaimStatus.INITIATED,
            beneficiaryVote: true,
            oracleVote: false,
            oracleConfidence: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        activeClaim[vault][msg.sender] = claimCount;

        // Freeze the vault and record the beneficiary approval on-chain.
        v.freezeForClaim(msg.sender);

        emit ClaimInitiated(claimCount, vault, msg.sender);
        return claimCount;
    }

    /**
     * @notice Oracle submits verification result for a claim.
     * @dev Relays the decision to the vault, where a positive verification supplies the second
     *      of the three signer approvals.
     */
    function submitVerification(
        uint256 claimId,
        bool deceased,
        uint256 confidence
    ) external onlyRole(ORACLE_ROLE) {
        Claim storage c = claims[claimId];
        require(c.status == ClaimStatus.INITIATED, "Invalid claim state");

        c.oracleConfidence = confidence;
        c.updatedAt = block.timestamp;

        bool verified = deceased && confidence >= MIN_CONFIDENCE;

        if (verified) {
            c.oracleVote = true;
            c.status = ClaimStatus.VERIFIED;
            IInheritanceVault(c.vault).recordOracleDecision(true);
            emit ClaimVerified(claimId, confidence);
        } else {
            c.oracleVote = false;
            c.status = ClaimStatus.DENIED;
            // Clear active claim so beneficiary can retry
            activeClaim[c.vault][c.beneficiary] = 0;
            // Unfreeze the vault: death could not be verified, so assets stay locked to the donor.
            IInheritanceVault(c.vault).recordOracleDecision(false);
            emit ClaimDenied(claimId, confidence);
        }
    }

    /**
     * @notice Donor cancels an improper claim while alive.
     * @dev The donor calls `donorCancel()` on the vault itself, which clears the approvals.
     *      This records the cancellation against the claim so the off-chain record agrees.
     *      Callable only by the vault owner, and only once the vault is actually unfrozen.
     */
    function cancelClaim(uint256 claimId) external {
        Claim storage c = claims[claimId];
        require(
            c.status == ClaimStatus.INITIATED || c.status == ClaimStatus.VERIFICATION_PENDING,
            "Claim not pending"
        );
        require(msg.sender == IInheritanceVault(c.vault).owner(), "Only donor");
        require(!IInheritanceVault(c.vault).frozen(), "Cancel on vault first");

        c.status = ClaimStatus.CANCELLED;
        c.updatedAt = block.timestamp;
        activeClaim[c.vault][c.beneficiary] = 0;

        emit ClaimCancelled(claimId, msg.sender);
    }

    /**
     * @notice Execute distribution after the vault authorizes release.
     * @dev Requires the dual vote at the claim layer and 2-of-3 authorization at the vault,
     *      then actually moves the beneficiary's ETH allocation out of the vault.
     */
    function executeClaim(uint256 claimId) external nonReentrant {
        Claim storage c = claims[claimId];
        require(c.status == ClaimStatus.VERIFIED, "Not verified");
        require(c.beneficiaryVote && c.oracleVote, "Dual vote required");

        IInheritanceVault v = IInheritanceVault(c.vault);
        require(v.isReleaseAuthorized(), "Vault not authorized");

        c.status = ClaimStatus.EXECUTED;
        c.updatedAt = block.timestamp;

        // Clear active claim
        activeClaim[c.vault][c.beneficiary] = 0;

        // Move the assets. Without this the claim would be marked executed while the vault
        // still held everything.
        uint256 ethReleased = v.releaseTo(c.beneficiary);

        emit AssetsReleased(claimId, c.beneficiary, ethReleased);
        emit ClaimExecuted(claimId);
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
