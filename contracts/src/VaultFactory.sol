// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./InheritanceVault.sol";

/**
 * @title VaultFactory
 * @notice Deploys new InheritanceVault instances as UUPS proxies.
 */
contract VaultFactory is Ownable {
    
    address public vaultImplementation;
    address public defaultOracle;
    
    address[] public deployedVaults;
    mapping(address => address[]) public userVaults;

    event VaultCreated(address indexed owner, address indexed vault, uint256 inactivityDays);
    event ImplementationUpdated(address indexed newImplementation);
    event DefaultOracleUpdated(address indexed newOracle);

    constructor(address _implementation, address _defaultOracle) Ownable(msg.sender) {
        vaultImplementation = _implementation;
        defaultOracle = _defaultOracle;
    }

    function createVault(uint256 _inactivityPeriodDays) external returns (address) {
        return createVaultWithOracle(_inactivityPeriodDays, defaultOracle);
    }

    function createVaultWithOracle(
        uint256 _inactivityPeriodDays,
        address _oracle
    ) public returns (address) {
        require(_oracle != address(0), "Invalid oracle");
        require(_inactivityPeriodDays > 0, "Invalid inactivity period");

        bytes memory initData = abi.encodeCall(
            InheritanceVault.initialize,
            (msg.sender, _oracle, _inactivityPeriodDays)
        );

        ERC1967Proxy proxy = new ERC1967Proxy(vaultImplementation, initData);
        address vaultAddress = address(proxy);

        deployedVaults.push(vaultAddress);
        userVaults[msg.sender].push(vaultAddress);

        emit VaultCreated(msg.sender, vaultAddress, _inactivityPeriodDays);
        return vaultAddress;
    }

    function updateImplementation(address _newImplementation) external onlyOwner {
        require(_newImplementation != address(0), "Invalid address");
        vaultImplementation = _newImplementation;
        emit ImplementationUpdated(_newImplementation);
    }

    function updateDefaultOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid address");
        defaultOracle = _newOracle;
        emit DefaultOracleUpdated(_newOracle);
    }

    function getDeployedVaultsCount() external view returns (uint256) {
        return deployedVaults.length;
    }

    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }
}
