// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title InheritanceVault
 * @notice Holds assets for a donor and distributes to beneficiaries upon death oracle confirmation.
 * @dev Uses UUPS proxy pattern with ReentrancyGuard. Integrates with DeathOracle for trigger verification.
 */
contract InheritanceVault is UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    
    struct Beneficiary {
        address wallet;
        uint256 allocationBps; // basis points (10000 = 100%)
        bool hasClaimed;
    }

    address public deathOracle;
    uint256 public inactivityPeriod;
    uint256 public lastActivity;
    bool public isTriggered;

    Beneficiary[] public beneficiaries;
    uint256 public totalAllocatedBps;

    event Deposited(address indexed from, uint256 amount);
    event BeneficiaryAdded(address indexed wallet, uint256 allocationBps);
    event BeneficiaryRemoved(address indexed wallet);
    event VaultTriggered(uint256 timestamp);
    event Claimed(address indexed beneficiary, uint256 amount);
    event ActivityRecorded(uint256 timestamp);

    modifier onlyOracle() {
        require(msg.sender == deathOracle, "Only oracle");
        _;
    }

    modifier notTriggered() {
        require(!isTriggered, "Vault already triggered");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _deathOracle,
        uint256 _inactivityPeriodDays
    ) external initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        deathOracle = _deathOracle;
        inactivityPeriod = _inactivityPeriodDays * 1 days;
        lastActivity = block.timestamp;
    }

    receive() external payable {
        lastActivity = block.timestamp;
        emit Deposited(msg.sender, msg.value);
        emit ActivityRecorded(block.timestamp);
    }

    function recordActivity() external onlyOwner notTriggered {
        lastActivity = block.timestamp;
        emit ActivityRecorded(block.timestamp);
    }

    function addBeneficiary(address _wallet, uint256 _allocationBps) external onlyOwner notTriggered {
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

    function removeBeneficiary(uint256 _index) external onlyOwner notTriggered {
        require(_index < beneficiaries.length, "Invalid index");
        
        address wallet = beneficiaries[_index].wallet;
        totalAllocatedBps -= beneficiaries[_index].allocationBps;

        beneficiaries[_index] = beneficiaries[beneficiaries.length - 1];
        beneficiaries.pop();

        emit BeneficiaryRemoved(wallet);
    }

    function triggerVault() external onlyOracle notTriggered {
        require(
            block.timestamp >= lastActivity + inactivityPeriod,
            "Inactivity period not elapsed"
        );
        isTriggered = true;
        emit VaultTriggered(block.timestamp);
    }

    function claim(uint256 _beneficiaryIndex) external nonReentrant {
        require(isTriggered, "Vault not triggered");
        require(_beneficiaryIndex < beneficiaries.length, "Invalid index");

        Beneficiary storage b = beneficiaries[_beneficiaryIndex];
        require(msg.sender == b.wallet, "Not beneficiary");
        require(!b.hasClaimed, "Already claimed");

        // Checks-Effects-Interactions
        b.hasClaimed = true;
        uint256 amount = (address(this).balance * b.allocationBps) / totalAllocatedBps;

        (bool success, ) = b.wallet.call{value: amount}("");
        require(success, "Transfer failed");

        emit Claimed(b.wallet, amount);
    }

    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
