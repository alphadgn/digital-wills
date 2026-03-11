// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title EmergencyPause
 * @notice Protocol-level emergency pause controller.
 * @dev Authorized guardians can pause/unpause the protocol.
 *      Other contracts check `isPaused()` before executing critical operations.
 */
contract EmergencyPause is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // Per-vault pause state
    mapping(address => bool) public vaultPaused;

    event VaultPaused(address indexed vault, address indexed guardian);
    event VaultUnpaused(address indexed vault, address indexed guardian);
    event ProtocolPaused(address indexed guardian);
    event ProtocolUnpaused(address indexed guardian);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
    }

    // ── Protocol-level pause ──

    function pauseProtocol() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit ProtocolPaused(msg.sender);
    }

    function unpauseProtocol() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit ProtocolUnpaused(msg.sender);
    }

    // ── Per-vault pause ──

    function pauseVault(address vault) external onlyRole(GUARDIAN_ROLE) {
        vaultPaused[vault] = true;
        emit VaultPaused(vault, msg.sender);
    }

    function unpauseVault(address vault) external onlyRole(GUARDIAN_ROLE) {
        vaultPaused[vault] = false;
        emit VaultUnpaused(vault, msg.sender);
    }

    // ── Status checks ──

    function isVaultOperational(address vault) external view returns (bool) {
        return !paused() && !vaultPaused[vault];
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
