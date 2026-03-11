// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title AssetRouter
 * @notice Routes ETH, ERC20, and ERC721 assets from a vault to beneficiaries
 *         according to their allocation percentages.
 * @dev Called by the vault after claim verification. Uses ReentrancyGuard for safety.
 */
contract AssetRouter is AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    struct Distribution {
        address vault;
        address beneficiary;
        uint256 ethAmount;
        address[] erc20Tokens;
        uint256[] erc20Amounts;
        address[] erc721Tokens;
        uint256[] erc721TokenIds;
        bool executed;
        uint256 executedAt;
    }

    mapping(uint256 => Distribution) public distributions;
    uint256 public distributionCount;

    event ETHDistributed(address indexed vault, address indexed beneficiary, uint256 amount);
    event ERC20Distributed(address indexed vault, address indexed beneficiary, address token, uint256 amount);
    event ERC721Distributed(address indexed vault, address indexed beneficiary, address token, uint256 tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function registerVault(address vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VAULT_ROLE, vault);
    }

    /**
     * @notice Distribute ETH to a beneficiary.
     */
    function distributeETH(
        address beneficiary,
        uint256 amount
    ) external payable onlyRole(VAULT_ROLE) nonReentrant {
        require(msg.value >= amount, "Insufficient ETH");

        (bool success,) = beneficiary.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit ETHDistributed(msg.sender, beneficiary, amount);
    }

    /**
     * @notice Distribute ERC20 tokens to a beneficiary.
     * @dev Vault must have approved this contract before calling.
     */
    function distributeERC20(
        address beneficiary,
        address token,
        uint256 amount
    ) external onlyRole(VAULT_ROLE) nonReentrant {
        require(IERC20(token).transfer(beneficiary, amount), "ERC20 transfer failed");
        emit ERC20Distributed(msg.sender, beneficiary, token, amount);
    }

    /**
     * @notice Distribute an ERC721 NFT to a beneficiary.
     * @dev Vault must have approved this contract before calling.
     */
    function distributeERC721(
        address beneficiary,
        address token,
        uint256 tokenId
    ) external onlyRole(VAULT_ROLE) nonReentrant {
        IERC721(token).safeTransferFrom(msg.sender, beneficiary, tokenId);
        emit ERC721Distributed(msg.sender, beneficiary, token, tokenId);
    }

    receive() external payable {}

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
