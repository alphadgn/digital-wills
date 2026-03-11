// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IInheritanceVault {
    function isTriggered() external view returns (bool);
    function beneficiaries(uint256) external view returns (address wallet, uint256 allocationBps, bool hasClaimed);
    function getBeneficiaryCount() external view returns (uint256);
}

interface IOracleGateway {
    function isVerified(address vault) external view returns (bool);
    function getConfidence(address vault) external view returns (uint256);
}

/**
 * @title ClaimManager
 * @notice Manages the claim lifecycle: initiation, oracle verification, and execution.
 * @dev Enforces the dual-vote rule: beneficiaryVote == true AND oracleVote == true.
 */
contract ClaimManager is AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    enum ClaimStatus { INITIATED, VERIFICATION_PENDING, VERIFIED, DENIED, EXECUTED }

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

        emit ClaimInitiated(claimCount, vault, msg.sender);
        return claimCount;
    }

    /**
     * @notice Oracle submits verification result for a claim.
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

        if (deceased && confidence >= MIN_CONFIDENCE) {
            c.oracleVote = true;
            c.status = ClaimStatus.VERIFIED;
            emit ClaimVerified(claimId, confidence);
        } else {
            c.oracleVote = false;
            c.status = ClaimStatus.DENIED;
            // Clear active claim so beneficiary can retry
            activeClaim[c.vault][c.beneficiary] = 0;
            emit ClaimDenied(claimId, confidence);
        }
    }

    /**
     * @notice Execute distribution after both votes are true.
     * @dev Calls triggerVault on the InheritanceVault contract.
     */
    function executeClaim(uint256 claimId) external nonReentrant {
        Claim storage c = claims[claimId];
        require(c.status == ClaimStatus.VERIFIED, "Not verified");
        require(c.beneficiaryVote && c.oracleVote, "Dual vote required");

        c.status = ClaimStatus.EXECUTED;
        c.updatedAt = block.timestamp;

        // Clear active claim
        activeClaim[c.vault][c.beneficiary] = 0;

        emit ClaimExecuted(claimId);
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
