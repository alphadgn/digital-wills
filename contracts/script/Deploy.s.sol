// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/InheritanceVault.sol";
import "../src/VaultFactory.sol";
import "../src/DeathOracle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy vault implementation
        InheritanceVault vaultImpl = new InheritanceVault();

        // 2. Deploy oracle with deployer as initial reporter, threshold = 1 for dev
        address[] memory reporters = new address[](1);
        reporters[0] = deployer;
        DeathOracle oracle = new DeathOracle(1, reporters);

        // 3. Deploy factory
        VaultFactory factory = new VaultFactory(address(vaultImpl), address(oracle));

        vm.stopBroadcast();

        console.log("VaultImpl:", address(vaultImpl));
        console.log("DeathOracle:", address(oracle));
        console.log("VaultFactory:", address(factory));
    }
}
