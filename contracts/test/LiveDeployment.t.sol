// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InheritanceVault.sol";
import "../src/VaultFactory.sol";
import "../src/ClaimManager.sol";
import "../src/OracleGateway.sol";

/**
 * End-to-end checks against the CONTRACTS ACTUALLY DEPLOYED on Robinhood Chain.
 *
 * The unit suite proves the code is correct; this proves the deployment is correct — that the
 * live factory points at the live implementation, that its vaults arrive wired to the live
 * ClaimManager, and that a claim filed through the live ClaimManager freezes a real vault and
 * can be cancelled by its donor.
 *
 * Runs against a fork, so it reads live state and spends nothing:
 *   forge test --match-contract LiveDeployment --fork-url robinhood -vv
 */
contract LiveDeploymentTest is Test {
    // Deployed addresses — Robinhood Chain (4663)
    VaultFactory constant FACTORY = VaultFactory(0xe5a42C68c42bA87fDa627e0af83281AC145175ac);
    ClaimManager constant CLAIM_MANAGER =
        ClaimManager(0xE89C46be71f7BF7dBDA398c719525431C6e7A3Ea);
    OracleGateway constant GATEWAY = OracleGateway(0x11850Bb3d719F157C80B28735031fAFAa6BBCdd1);
    address constant VAULT_IMPL = 0xC2644C70FBBd9059011e6C60211C45EAcB6603c7;
    address constant DEATH_ORACLE = 0x85Ba00086F6323c5035a16c0F34f5BC45A6C7734;

    address donor = makeAddr("donor");
    address heir = makeAddr("heir");

    /**
     * @dev These addresses only exist on a fork of Robinhood Chain. Without `--fork-url` the
     *      whole suite would fail on an empty EVM, so skip rather than report a false failure:
     *      a plain `forge test` should stay green, and this suite runs when pointed at a fork.
     */
    modifier onlyForked() {
        if (address(FACTORY).code.length == 0) {
            vm.skip(true);
            return;
        }
        _;
    }

    function test_LiveFactoryIsWiredCorrectly() public onlyForked {
        assertEq(FACTORY.vaultImplementation(), VAULT_IMPL, "factory -> current implementation");
        assertEq(
            FACTORY.defaultClaimManager(),
            address(CLAIM_MANAGER),
            "factory -> live ClaimManager"
        );
        assertEq(
            FACTORY.defaultOracleAuthority(),
            address(GATEWAY),
            "factory -> live OracleGateway"
        );
        assertEq(FACTORY.defaultOracle(), DEATH_ORACLE, "factory -> live DeathOracle");
    }

    function test_LiveClaimManagerIsWiredToGateway() public onlyForked {
        assertEq(address(CLAIM_MANAGER.oracleGateway()), address(GATEWAY));
        assertGt(GATEWAY.threshold(), 0, "oracle threshold configured");
    }

    /// @dev A vault created by the live factory must arrive usable with no donor setup.
    function test_LiveVaultArrivesWired() public onlyForked {
        vm.prank(donor);
        address vaultAddr = FACTORY.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        assertEq(vault.owner(), donor, "donor owns it");
        assertEq(vault.claimManager(), address(CLAIM_MANAGER), "wired at creation");
        assertEq(vault.oracleAuthority(), address(GATEWAY));
        assertFalse(vault.frozen());
        assertEq(vault.approvalCount(), 0);
    }

    /// @dev The full path the About page promises, against live contracts.
    function test_LiveClaimFreezesAndDonorCanCancel() public onlyForked {
        vm.prank(donor);
        address vaultAddr = FACTORY.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.prank(donor);
        vault.addBeneficiary(heir, 10000);
        vm.deal(vaultAddr, 5 ether);

        // Beneficiary files a claim through the live ClaimManager.
        vm.prank(heir);
        uint256 claimId = CLAIM_MANAGER.initiateClaim(vaultAddr);

        assertTrue(vault.frozen(), "claim freezes the vault");
        assertEq(vault.claimant(), heir);
        assertEq(vault.approvalCount(), 1, "beneficiary alone is 1 of 3");
        assertFalse(vault.isReleaseAuthorized(), "1 of 3 releases nothing");
        assertTrue(vault.donorWindowOpen(), "donor has a window to respond");

        // A living donor cancels it.
        vm.prank(donor);
        vault.donorCancel();

        assertFalse(vault.frozen(), "cancel unfreezes");
        assertEq(vault.approvalCount(), 0, "cancel clears approvals");
        assertEq(address(vaultAddr).balance, 5 ether, "assets untouched");

        // And the donor is back in control of the will.
        vm.startPrank(donor);
        vault.removeBeneficiary(0);
        vault.addBeneficiary(makeAddr("newHeir"), 10000);
        vm.stopPrank();

        // The claim record can then be settled off-chain.
        (, , ClaimManager.ClaimStatus status, , , , , ) = CLAIM_MANAGER.claims(claimId);
        assertEq(uint256(status), uint256(ClaimManager.ClaimStatus.INITIATED));
    }

    /// @dev No verified death, no release — against the live deployment.
    function test_LiveBeneficiaryCannotDrainVault() public onlyForked {
        vm.prank(donor);
        address vaultAddr = FACTORY.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.prank(donor);
        vault.addBeneficiary(heir, 10000);
        vm.deal(vaultAddr, 5 ether);

        vm.prank(heir);
        CLAIM_MANAGER.initiateClaim(vaultAddr);

        // Filing a claim is not authorization.
        vm.prank(heir);
        vm.expectRevert("Release not authorized");
        vault.claim(0);

        assertEq(address(vaultAddr).balance, 5 ether, "nothing moved");
    }
}
