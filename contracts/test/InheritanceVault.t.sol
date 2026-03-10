// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InheritanceVault.sol";
import "../src/VaultFactory.sol";
import "../src/DeathOracle.sol";

contract InheritanceVaultTest is Test {
    InheritanceVault public vaultImpl;
    VaultFactory public factory;
    DeathOracle public oracle;
    
    address public owner = address(0x1);
    address public beneficiary1 = address(0x2);
    address public beneficiary2 = address(0x3);
    address public reporter = address(0x4);

    function setUp() public {
        vaultImpl = new InheritanceVault();
        
        address[] memory reporters = new address[](1);
        reporters[0] = reporter;
        oracle = new DeathOracle(1, reporters);
        
        factory = new VaultFactory(address(vaultImpl), address(oracle));
    }

    function testCreateVault() public {
        vm.prank(owner);
        address vault = factory.createVault(365);
        assertTrue(vault != address(0));
        assertEq(factory.getDeployedVaultsCount(), 1);
    }

    function testAddBeneficiary() public {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.prank(owner);
        vault.addBeneficiary(beneficiary1, 5000);
        
        assertEq(vault.getBeneficiaryCount(), 1);
    }

    function testCannotClaimBeforeTrigger() public {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.prank(owner);
        vault.addBeneficiary(beneficiary1, 10000);

        vm.deal(vaultAddr, 10 ether);

        vm.prank(beneficiary1);
        vm.expectRevert("Vault not triggered");
        vault.claim(0);
    }

    function testFullFlow() public {
        // Create vault
        vm.prank(owner);
        address vaultAddr = factory.createVault(1); // 1 day inactivity
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        // Add beneficiary
        vm.prank(owner);
        vault.addBeneficiary(beneficiary1, 10000);

        // Fund vault
        vm.deal(vaultAddr, 10 ether);

        // Warp past inactivity period
        vm.warp(block.timestamp + 2 days);

        // Trigger via oracle
        vm.prank(reporter);
        oracle.requestTrigger(vaultAddr);

        assertTrue(vault.isTriggered());

        // Claim
        uint256 balBefore = beneficiary1.balance;
        vm.prank(beneficiary1);
        vault.claim(0);
        assertGt(beneficiary1.balance, balBefore);
    }
}
