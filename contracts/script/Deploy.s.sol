// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/InheritanceVault.sol";
import "../src/VaultFactory.sol";
import "../src/DeathOracle.sol";
import "../src/OracleGateway.sol";
import "../src/ClaimManager.sol";
import "../src/AssetRouter.sol";

contract DeployScript is Script {
    /**
     * @dev Reads the deployer key from DEPLOYER_KEY, falling back to PRIVATE_KEY.
     *      Foundry loads `.env` from the directory you run `forge` in, so run this from the
     *      repo root (`forge script contracts/script/Deploy.s.sol`) or keep a gitignored
     *      copy of the key at `contracts/.env`.
     */
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("DEPLOYER_KEY", uint256(0));
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        }
        require(deployerPrivateKey != 0, "Set DEPLOYER_KEY in .env");

        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy vault implementation
        InheritanceVault vaultImpl = new InheritanceVault();

        // 2. Deploy oracle with deployer as initial reporter, threshold = 1 for dev
        address[] memory reporters = new address[](1);
        reporters[0] = deployer;
        DeathOracle oracle = new DeathOracle(1, reporters);

        // 3. Deploy the oracle gateway (signed N-of-M death verification)
        OracleGateway gatewayImpl = new OracleGateway();
        OracleGateway gateway = OracleGateway(
            address(new ERC1967Proxy(
                address(gatewayImpl),
                abi.encodeCall(OracleGateway.initialize, (deployer, 1))
            ))
        );
        gateway.grantRole(gateway.REPORTER_ROLE(), deployer);

        // 4. Deploy the claim manager, which drives freeze, verification and release.
        //    It must exist before the factory, which wires every new vault to it.
        ClaimManager claimImpl = new ClaimManager();
        ClaimManager claimManager = ClaimManager(
            address(new ERC1967Proxy(
                address(claimImpl),
                abi.encodeCall(ClaimManager.initialize, (deployer, address(gateway)))
            ))
        );

        // 5. Deploy the factory, wired so every vault it creates is usable immediately.
        VaultFactory factory = new VaultFactory(
            address(vaultImpl),
            address(oracle),
            address(claimManager),
            address(gateway)
        );

        // 6. Deploy the asset router (ETH / ERC-20 / ERC-721 / ERC-1155 distribution)
        AssetRouter routerImpl = new AssetRouter();
        AssetRouter router = AssetRouter(
            payable(address(new ERC1967Proxy(
                address(routerImpl),
                abi.encodeCall(AssetRouter.initialize, (deployer))
            )))
        );

        vm.stopBroadcast();

        console.log("VaultImpl:", address(vaultImpl));
        console.log("DeathOracle:", address(oracle));
        console.log("VaultFactory:", address(factory));
        console.log("OracleGateway:", address(gateway));
        console.log("ClaimManager:", address(claimManager));
        console.log("AssetRouter:", address(router));
        console.log("");
        console.log("New vaults are wired to the claim manager and oracle authority at");
        console.log("creation - no per-vault setup is required.");
    }
}
