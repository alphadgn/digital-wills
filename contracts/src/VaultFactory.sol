// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./InheritanceVault.sol";

/**
 * @title VaultFactory
 * @notice Deploys new InheritanceVault instances as UUPS proxies, wired and ready to use.
 *
 * @dev Every vault is created with its ClaimManager already set. This is deliberate: the
 *      vault's `setClaimManager` is `onlyOwner` and the owner is the donor, so the factory
 *      cannot supply it after deployment — it has to happen during `initialize`. A vault
 *      without a claim manager silently cannot be frozen by a claim, which also means its
 *      donor cannot cancel one. That failure is invisible until the moment it matters, so
 *      the wiring is not left as a step someone has to remember.
 *
 *      The donor remains free to point the vault at a different claim manager, or to unset
 *      it entirely, via `setClaimManager`.
 */
contract VaultFactory is Ownable {

    address public vaultImplementation;
    address public defaultOracle;

    /// @notice ClaimManager every new vault is wired to. Zero leaves new vaults unwired.
    address public defaultClaimManager;
    /// @notice Death verification authority for new vaults. Zero falls back to the oracle.
    address public defaultOracleAuthority;

    address[] public deployedVaults;
    mapping(address => address[]) public userVaults;

    event VaultCreated(address indexed owner, address indexed vault, uint256 inactivityDays);
    event ImplementationUpdated(address indexed newImplementation);
    event DefaultOracleUpdated(address indexed newOracle);
    event DefaultClaimManagerUpdated(address indexed newClaimManager);
    event DefaultOracleAuthorityUpdated(address indexed newAuthority);

    constructor(
        address _implementation,
        address _defaultOracle,
        address _defaultClaimManager,
        address _defaultOracleAuthority
    ) Ownable(msg.sender) {
        vaultImplementation = _implementation;
        defaultOracle = _defaultOracle;
        defaultClaimManager = _defaultClaimManager;
        defaultOracleAuthority = _defaultOracleAuthority;
    }

    function createVault(uint256 _inactivityPeriodDays) external returns (address) {
        return createVaultWithOracle(_inactivityPeriodDays, defaultOracle);
    }

    function createVaultWithOracle(
        uint256 _inactivityPeriodDays,
        address _oracle
    ) public returns (address) {
        return
            createVaultWithConfig(
                _inactivityPeriodDays,
                _oracle,
                defaultClaimManager,
                defaultOracleAuthority
            );
    }

    /**
     * @notice Deploy a vault with an explicit signer configuration.
     * @dev Lets a donor opt out of the factory's defaults at creation time rather than
     *      having to re-point the vault afterwards.
     */
    function createVaultWithConfig(
        uint256 _inactivityPeriodDays,
        address _oracle,
        address _claimManager,
        address _oracleAuthority
    ) public returns (address) {
        require(_oracle != address(0), "Invalid oracle");
        require(_inactivityPeriodDays > 0, "Invalid inactivity period");

        bytes memory initData = abi.encodeCall(
            InheritanceVault.initialize,
            (msg.sender, _oracle, _inactivityPeriodDays, _claimManager, _oracleAuthority)
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

    /// @dev Affects vaults created from here on; existing vaults keep what they were given.
    function updateDefaultClaimManager(address _newClaimManager) external onlyOwner {
        defaultClaimManager = _newClaimManager;
        emit DefaultClaimManagerUpdated(_newClaimManager);
    }

    function updateDefaultOracleAuthority(address _newAuthority) external onlyOwner {
        defaultOracleAuthority = _newAuthority;
        emit DefaultOracleAuthorityUpdated(_newAuthority);
    }

    function getDeployedVaultsCount() external view returns (uint256) {
        return deployedVaults.length;
    }

    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }
}
