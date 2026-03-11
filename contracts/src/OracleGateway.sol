// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title OracleGateway
 * @notice Aggregates death verification reports from multiple authorized reporters.
 * @dev Uses a multi-sig threshold model: N-of-M reporters must confirm before
 *      the result is considered verified.
 */
contract OracleGateway is AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    struct VerificationRequest {
        address vault;
        uint256 confirmations;
        uint256 denials;
        bool finalized;
        bool result; // true = deceased
        uint256 aggregateConfidence; // sum of confidence scores
        uint256 reportCount;
        uint256 createdAt;
        uint256 finalizedAt;
    }

    uint256 public threshold; // number of confirmations required
    mapping(uint256 => VerificationRequest) public requests;
    uint256 public requestCount;

    // requestId => reporter => hasReported
    mapping(uint256 => mapping(address => bool)) public hasReported;
    // vault => latest requestId
    mapping(address => uint256) public latestRequest;

    event RequestCreated(uint256 indexed requestId, address indexed vault);
    event ReportSubmitted(uint256 indexed requestId, address indexed reporter, bool deceased, uint256 confidence);
    event RequestFinalized(uint256 indexed requestId, bool deceased, uint256 avgConfidence);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin, uint256 _threshold) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        require(_threshold > 0, "Threshold must be > 0");
        threshold = _threshold;
    }

    function createRequest(address vault) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        requestCount++;
        requests[requestCount] = VerificationRequest({
            vault: vault,
            confirmations: 0,
            denials: 0,
            finalized: false,
            result: false,
            aggregateConfidence: 0,
            reportCount: 0,
            createdAt: block.timestamp,
            finalizedAt: 0
        });
        latestRequest[vault] = requestCount;
        emit RequestCreated(requestCount, vault);
        return requestCount;
    }

    function submitReport(
        uint256 requestId,
        bool deceased,
        uint256 confidence // scaled 0–10000
    ) external onlyRole(REPORTER_ROLE) {
        VerificationRequest storage r = requests[requestId];
        require(!r.finalized, "Already finalized");
        require(!hasReported[requestId][msg.sender], "Already reported");
        require(confidence <= 10000, "Invalid confidence");

        hasReported[requestId][msg.sender] = true;
        r.reportCount++;
        r.aggregateConfidence += confidence;

        if (deceased) {
            r.confirmations++;
        } else {
            r.denials++;
        }

        emit ReportSubmitted(requestId, msg.sender, deceased, confidence);

        // Auto-finalize if threshold met
        if (r.confirmations >= threshold) {
            r.finalized = true;
            r.result = true;
            r.finalizedAt = block.timestamp;
            emit RequestFinalized(requestId, true, r.aggregateConfidence / r.reportCount);
        } else if (r.denials >= threshold) {
            r.finalized = true;
            r.result = false;
            r.finalizedAt = block.timestamp;
            emit RequestFinalized(requestId, false, r.aggregateConfidence / r.reportCount);
        }
    }

    function isVerified(address vault) external view returns (bool) {
        uint256 rid = latestRequest[vault];
        if (rid == 0) return false;
        return requests[rid].finalized && requests[rid].result;
    }

    function getConfidence(address vault) external view returns (uint256) {
        uint256 rid = latestRequest[vault];
        if (rid == 0 || requests[rid].reportCount == 0) return 0;
        return requests[rid].aggregateConfidence / requests[rid].reportCount;
    }

    function setThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold > 0, "Threshold must be > 0");
        threshold = _threshold;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
