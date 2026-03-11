// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title BeneficiaryRegistry
 * @notice On-chain registry of beneficiary allocations per vault.
 * @dev Vault owners manage allocations; ClaimManager reads them for distribution.
 */
contract BeneficiaryRegistry is AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    struct Beneficiary {
        address wallet;
        uint256 allocationBps; // basis points (10000 = 100%)
        bool exists;
    }

    // vaultAddress => beneficiary wallet => Beneficiary
    mapping(address => mapping(address => Beneficiary)) public beneficiaries;
    // vaultAddress => list of beneficiary wallets
    mapping(address => address[]) public beneficiaryList;
    // vaultAddress => total allocated bps
    mapping(address => uint256) public totalAllocatedBps;

    event BeneficiaryAdded(address indexed vault, address indexed wallet, uint256 allocationBps);
    event BeneficiaryRemoved(address indexed vault, address indexed wallet);
    event AllocationUpdated(address indexed vault, address indexed wallet, uint256 newBps);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function registerVault(address vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VAULT_ROLE, vault);
    }

    function addBeneficiary(
        address vault,
        address wallet,
        uint256 allocationBps
    ) external onlyRole(VAULT_ROLE) {
        require(!beneficiaries[vault][wallet].exists, "Already registered");
        require(allocationBps > 0, "Allocation must be > 0");
        require(totalAllocatedBps[vault] + allocationBps <= 10000, "Exceeds 100%");

        beneficiaries[vault][wallet] = Beneficiary(wallet, allocationBps, true);
        beneficiaryList[vault].push(wallet);
        totalAllocatedBps[vault] += allocationBps;

        emit BeneficiaryAdded(vault, wallet, allocationBps);
    }

    function removeBeneficiary(address vault, address wallet) external onlyRole(VAULT_ROLE) {
        require(beneficiaries[vault][wallet].exists, "Not found");

        totalAllocatedBps[vault] -= beneficiaries[vault][wallet].allocationBps;
        delete beneficiaries[vault][wallet];

        // Remove from list
        address[] storage list = beneficiaryList[vault];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == wallet) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }

        emit BeneficiaryRemoved(vault, wallet);
    }

    function getBeneficiaryCount(address vault) external view returns (uint256) {
        return beneficiaryList[vault].length;
    }

    function getBeneficiary(address vault, address wallet) external view returns (Beneficiary memory) {
        return beneficiaries[vault][wallet];
    }

    function getAllBeneficiaries(address vault) external view returns (address[] memory) {
        return beneficiaryList[vault];
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
