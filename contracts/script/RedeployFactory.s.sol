// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/InheritanceVault.sol";
import "../src/VaultFactory.sol";

/**
 * Redeploy only the contracts whose code changed when vault wiring moved into the factory:
 * the vault implementation (new `initialize` signature) and the factory (new constructor).
 *
 * ClaimManager, OracleGateway, AssetRouter and DeathOracle are untouched, so their existing
 * deployments are reused. Vaults created by the OLD factory keep working — they are separate
 * proxies with their own storage, and their donors can still wire them by hand.
 *
 * Existing addresses are passed in so nothing is silently redeployed:
 *   CLAIM_MANAGER, ORACLE_GATEWAY, DEATH_ORACLE
 */
contract RedeployFactoryScript is Script {
    function run() external {
        uint256 pk = vm.envOr("DEPLOYER_KEY", uint256(0));
        if (pk == 0) pk = vm.envUint("PRIVATE_KEY");
        require(pk != 0, "Set DEPLOYER_KEY in .env");

        address claimManager = vm.envAddress("CLAIM_MANAGER");
        address oracleGateway = vm.envAddress("ORACLE_GATEWAY");
        address deathOracle = vm.envAddress("DEATH_ORACLE");

        vm.startBroadcast(pk);

        // New implementation: initialize() now takes the claim manager and oracle authority.
        InheritanceVault vaultImpl = new InheritanceVault();

        // New factory: wires every vault it creates, so no per-vault setup is needed.
        VaultFactory factory = new VaultFactory(
            address(vaultImpl),
            deathOracle,
            claimManager,
            oracleGateway
        );

        vm.stopBroadcast();

        console.log("VaultImpl (new):   ", address(vaultImpl));
        console.log("VaultFactory (new):", address(factory));
        console.log("");
        console.log("Reused unchanged:");
        console.log("  ClaimManager:    ", claimManager);
        console.log("  OracleGateway:   ", oracleGateway);
        console.log("  DeathOracle:     ", deathOracle);
    }
}
