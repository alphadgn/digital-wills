// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DeathOracle
 * @notice Multi-sig oracle that confirms inactivity/death events to trigger vault distributions.
 * @dev Requires threshold confirmations from authorized reporters before triggering a vault.
 */
contract DeathOracle is AccessControl {
    
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    uint256 public confirmationThreshold;

    struct TriggerRequest {
        address vault;
        uint256 confirmations;
        bool executed;
        mapping(address => bool) hasConfirmed;
    }

    uint256 public requestCount;
    mapping(uint256 => TriggerRequest) public requests;
    mapping(address => uint256) public activeRequest; // vault => requestId

    event TriggerRequested(uint256 indexed requestId, address indexed vault, address indexed reporter);
    event TriggerConfirmed(uint256 indexed requestId, address indexed reporter, uint256 confirmations);
    event TriggerExecuted(uint256 indexed requestId, address indexed vault);
    event ThresholdUpdated(uint256 newThreshold);

    constructor(uint256 _threshold, address[] memory _reporters) {
        require(_threshold > 0 && _threshold <= _reporters.length, "Invalid threshold");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        for (uint256 i = 0; i < _reporters.length; i++) {
            _grantRole(REPORTER_ROLE, _reporters[i]);
        }
        
        confirmationThreshold = _threshold;
    }

    function requestTrigger(address _vault) external onlyRole(REPORTER_ROLE) returns (uint256) {
        require(activeRequest[_vault] == 0 || requests[activeRequest[_vault]].executed, "Active request exists");

        requestCount++;
        TriggerRequest storage req = requests[requestCount];
        req.vault = _vault;
        req.confirmations = 1;
        req.hasConfirmed[msg.sender] = true;
        
        activeRequest[_vault] = requestCount;

        emit TriggerRequested(requestCount, _vault, msg.sender);

        if (req.confirmations >= confirmationThreshold) {
            _executeTrigger(requestCount);
        }

        return requestCount;
    }

    function confirmTrigger(uint256 _requestId) external onlyRole(REPORTER_ROLE) {
        TriggerRequest storage req = requests[_requestId];
        require(req.vault != address(0), "Request does not exist");
        require(!req.executed, "Already executed");
        require(!req.hasConfirmed[msg.sender], "Already confirmed");

        req.hasConfirmed[msg.sender] = true;
        req.confirmations++;

        emit TriggerConfirmed(_requestId, msg.sender, req.confirmations);

        if (req.confirmations >= confirmationThreshold) {
            _executeTrigger(_requestId);
        }
    }

    function _executeTrigger(uint256 _requestId) internal {
        TriggerRequest storage req = requests[_requestId];
        req.executed = true;

        // Call triggerVault() on the InheritanceVault
        (bool success, ) = req.vault.call(abi.encodeWithSignature("triggerVault()"));
        require(success, "Vault trigger failed");

        emit TriggerExecuted(_requestId, req.vault);
    }

    function updateThreshold(uint256 _newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newThreshold > 0, "Threshold must be > 0");
        confirmationThreshold = _newThreshold;
        emit ThresholdUpdated(_newThreshold);
    }

    function hasConfirmed(uint256 _requestId, address _reporter) external view returns (bool) {
        return requests[_requestId].hasConfirmed[_reporter];
    }
}
