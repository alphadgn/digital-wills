// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InheritanceVault.sol";
import "../src/VaultFactory.sol";
import "../src/DeathOracle.sol";
import "../src/ClaimManager.sol";
import "../src/OracleGateway.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// ── Minimal token doubles for release tests ──

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }
    function transfer(address to, uint256 amt) external returns (bool) {
        require(balanceOf[msg.sender] >= amt, "insufficient");
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }
}

contract MockERC721 {
    mapping(uint256 => address) public ownerOf;
    function mint(address to, uint256 id) external { ownerOf[id] = to; }
    function safeTransferFrom(address from, address to, uint256 id) external {
        require(ownerOf[id] == from, "not owner");
        ownerOf[id] = to;
    }
}

contract MockERC1155 {
    mapping(address => mapping(uint256 => uint256)) public balanceOf;
    function mint(address to, uint256 id, uint256 amt) external { balanceOf[to][id] += amt; }
    function safeTransferFrom(address from, address to, uint256 id, uint256 amt, bytes calldata) external {
        require(balanceOf[from][id] >= amt, "insufficient");
        balanceOf[from][id] -= amt;
        balanceOf[to][id] += amt;
    }
}

contract InheritanceVaultTest is Test {
    InheritanceVault public vaultImpl;
    VaultFactory public factory;
    DeathOracle public oracle;
    ClaimManager public claimManager;
    OracleGateway public gateway;

    address public owner = address(0x1);
    address public beneficiary1 = address(0x2);
    address public beneficiary2 = address(0x3);
    address public reporter = address(0x4);
    address public oracleAuthority = address(0x5);
    address public stranger = address(0x6);

    function setUp() public {
        vaultImpl = new InheritanceVault();

        address[] memory reporters = new address[](1);
        reporters[0] = reporter;
        oracle = new DeathOracle(1, reporters);

        // OracleGateway behind a proxy
        OracleGateway gwImpl = new OracleGateway();
        bytes memory gwInit = abi.encodeCall(OracleGateway.initialize, (address(this), 1));
        gateway = OracleGateway(address(new ERC1967Proxy(address(gwImpl), gwInit)));

        // ClaimManager behind a proxy
        ClaimManager cmImpl = new ClaimManager();
        bytes memory cmInit = abi.encodeCall(ClaimManager.initialize, (address(this), address(gateway)));
        claimManager = ClaimManager(address(new ERC1967Proxy(address(cmImpl), cmInit)));
        claimManager.grantRole(claimManager.ORACLE_ROLE(), address(this));

        // The factory wires every vault it creates to the claim manager, so it is
        // constructed last.
        factory = new VaultFactory(
            address(vaultImpl),
            address(oracle),
            address(claimManager),
            oracleAuthority
        );
    }

    /// @dev Vault wired to the ClaimManager with one beneficiary at 100% and funded.
    function _fundedVault(uint256 amount) internal returns (InheritanceVault vault) {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        vault = InheritanceVault(payable(vaultAddr));

        // No setClaimManager / setOracleAuthority here: the factory wired both at creation.
        vm.prank(owner);
        vault.addBeneficiary(beneficiary1, 10000);

        vm.deal(vaultAddr, amount);
    }

    // ── Existing behaviour ──

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

    function testCannotClaimBeforeRelease() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        vm.expectRevert("Release not authorized");
        vault.claim(0);
    }

    // ── 2-of-3 authorization ──

    function testSingleApprovalDoesNotAuthorizeRelease() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        claimManager.initiateClaim(address(vault));

        assertEq(vault.approvalCount(), 1, "only beneficiary approved");
        assertFalse(vault.isReleaseAuthorized(), "1 of 3 must not authorize");
        assertFalse(vault.released());

        vm.prank(beneficiary1);
        vm.expectRevert("Release not authorized");
        vault.claim(0);
    }

    function testBeneficiaryPlusOracleAuthorizesRelease() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));

        claimManager.submitVerification(claimId, true, 9900);

        assertEq(vault.approvalCount(), 2);
        assertTrue(vault.isReleaseAuthorized());
        assertTrue(vault.released());
    }

    function testDonorPlusBeneficiaryAuthorizesRelease() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        claimManager.initiateClaim(address(vault));

        // Donor voluntarily approves: DONOR + BENEFICIARY = 2 of 3.
        vm.prank(owner);
        vault.donorApprove();

        assertEq(vault.approvalCount(), 2);
        assertTrue(vault.isReleaseAuthorized());
    }

    // ── Freeze on claim ──

    function testClaimFreezesVault() public {
        InheritanceVault vault = _fundedVault(10 ether);
        assertFalse(vault.frozen());

        vm.prank(beneficiary1);
        claimManager.initiateClaim(address(vault));

        assertTrue(vault.frozen(), "claim must freeze the vault");
        assertEq(vault.claimant(), beneficiary1);
        assertTrue(vault.donorWindowOpen(), "donor cancellation window opens");
    }

    function testFrozenVaultBlocksDonorReconfiguration() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        claimManager.initiateClaim(address(vault));

        vm.prank(owner);
        vm.expectRevert("Vault frozen: claim pending");
        vault.addBeneficiary(beneficiary2, 1000);
    }

    // ── Donor cancellation ──

    function testDonorCancelsImproperClaim() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));
        assertTrue(vault.frozen());

        vm.prank(owner);
        vault.donorCancel();

        assertFalse(vault.frozen(), "cancel unfreezes the vault");
        assertEq(vault.approvalCount(), 0, "cancel clears every approval");
        assertEq(vault.claimant(), address(0));

        // Claim record follows the vault.
        vm.prank(owner);
        claimManager.cancelClaim(claimId);
        (,, ClaimManager.ClaimStatus status,,,,,) = claimManager.claims(claimId);
        assertEq(uint256(status), uint256(ClaimManager.ClaimStatus.CANCELLED));

        // Donor is back in control and can change the designated beneficiary.
        vm.startPrank(owner);
        vault.removeBeneficiary(0);
        vault.addBeneficiary(beneficiary2, 10000);
        vm.stopPrank();

        (address wallet,,) = vault.beneficiaries(0);
        assertEq(wallet, beneficiary2, "donor may redesignate while alive");
    }

    function testDonorCancelRecordsProofOfLife() public {
        InheritanceVault vault = _fundedVault(10 ether);
        uint256 before = vault.lastActivity();

        vm.warp(block.timestamp + 30 days);
        vm.prank(beneficiary1);
        claimManager.initiateClaim(address(vault));

        vm.prank(owner);
        vault.donorCancel();

        assertGt(vault.lastActivity(), before, "cancellation is proof of life");
    }

    function testOnlyDonorCanCancel() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        claimManager.initiateClaim(address(vault));

        vm.prank(stranger);
        vm.expectRevert();
        vault.donorCancel();
    }

    function testDonorCannotCancelAfterAuthorization() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));
        claimManager.submitVerification(claimId, true, 9900);

        // 2-of-3 stands; the donor veto window is over.
        vm.prank(owner);
        vm.expectRevert("Release already authorized");
        vault.donorCancel();
    }

    // ── Unverified death keeps assets locked ──

    function testUnverifiedDeathLocksAssets() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));

        // Oracle cannot verify: confidence below the 0.99 threshold.
        claimManager.submitVerification(claimId, false, 4000);

        assertFalse(vault.released(), "no verified death, no release");
        assertFalse(vault.frozen(), "vault returns to the donor");
        assertEq(vault.approvalCount(), 0);
        assertEq(address(vault).balance, 10 ether, "assets stay put");

        vm.prank(beneficiary1);
        vm.expectRevert("Release not authorized");
        vault.claim(0);
    }

    function testLowConfidenceIsNotVerification() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));

        // Reported deceased, but under MIN_CONFIDENCE.
        claimManager.submitVerification(claimId, true, 9899);

        assertFalse(vault.released());
        assertEq(address(vault).balance, 10 ether);
    }

    // ── executeClaim actually moves assets ──

    function testExecuteClaimTransfersEth() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));
        claimManager.submitVerification(claimId, true, 9900);

        uint256 balBefore = beneficiary1.balance;
        claimManager.executeClaim(claimId);

        assertEq(beneficiary1.balance, balBefore + 10 ether, "assets must actually move");
        assertEq(address(vault).balance, 0);
    }

    function testExecuteClaimRequiresVaultAuthorization() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));

        vm.expectRevert("Not verified");
        claimManager.executeClaim(claimId);
    }

    function testAllocationsSplitProRata() public {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.startPrank(owner);
        vault.addBeneficiary(beneficiary1, 7000);
        vault.addBeneficiary(beneficiary2, 3000);
        vm.stopPrank();

        vm.deal(vaultAddr, 10 ether);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(vaultAddr);
        claimManager.submitVerification(claimId, true, 9900);

        uint256 b1Before = beneficiary1.balance;
        uint256 b2Before = beneficiary2.balance;

        claimManager.executeClaim(claimId);
        vm.prank(beneficiary2);
        vault.claim(1);

        // The snapshot is taken at authorization, so a later claimant is not shortchanged
        // by an earlier withdrawal.
        assertEq(beneficiary1.balance - b1Before, 7 ether);
        assertEq(beneficiary2.balance - b2Before, 3 ether);
    }

    // ── Token support ──

    function testVaultHoldsAndReleasesERC20() public {
        InheritanceVault vault = _fundedVault(1 ether);
        MockERC20 token = new MockERC20();
        token.mint(address(vault), 500);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));
        claimManager.submitVerification(claimId, true, 9900);

        vm.prank(beneficiary1);
        vault.releaseERC20(beneficiary1, address(token), 500);

        assertEq(token.balanceOf(beneficiary1), 500);
    }

    function testVaultHoldsAndReleasesERC721() public {
        InheritanceVault vault = _fundedVault(1 ether);
        MockERC721 nft = new MockERC721();
        nft.mint(address(vault), 42);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));
        claimManager.submitVerification(claimId, true, 9900);

        vm.prank(beneficiary1);
        vault.releaseERC721(beneficiary1, address(nft), 42);

        assertEq(nft.ownerOf(42), beneficiary1);
    }

    function testVaultHoldsAndReleasesERC1155() public {
        InheritanceVault vault = _fundedVault(1 ether);
        MockERC1155 multi = new MockERC1155();
        multi.mint(address(vault), 7, 100);

        vm.prank(beneficiary1);
        uint256 claimId = claimManager.initiateClaim(address(vault));
        claimManager.submitVerification(claimId, true, 9900);

        vm.prank(beneficiary1);
        vault.releaseERC1155(beneficiary1, address(multi), 7, 100);

        assertEq(multi.balanceOf(beneficiary1, 7), 100);
    }

    function testCannotReleaseTokensBeforeAuthorization() public {
        InheritanceVault vault = _fundedVault(1 ether);
        MockERC20 token = new MockERC20();
        token.mint(address(vault), 500);

        vm.prank(beneficiary1);
        vm.expectRevert("Release not authorized");
        vault.releaseERC20(beneficiary1, address(token), 500);
    }

    // ── Signed oracle decisions ──

    function testSignedReportRecordedOnChain() public {
        (address signer, uint256 pk) = makeAddrAndKey("reporter");
        gateway.grantRole(gateway.REPORTER_ROLE(), signer);

        vm.prank(owner);
        address vaultAddr = factory.createVault(365);

        uint256 requestId = gateway.createRequest(vaultAddr);

        bytes32 digest = gateway.hashDeathReport(requestId, true, 9900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Relayed by a third party: authorship comes from the signature.
        vm.prank(stranger);
        address recovered = gateway.submitSignedReport(requestId, true, 9900, sig);

        assertEq(recovered, signer, "decision attributable to the reporter");
        assertEq(gateway.getReportSignature(requestId, signer), sig, "signature stored on-chain");
        assertTrue(gateway.isVerified(vaultAddr));
    }

    function testSignedReportRejectsNonReporter() public {
        (, uint256 pk) = makeAddrAndKey("impostor");

        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        uint256 requestId = gateway.createRequest(vaultAddr);

        bytes32 digest = gateway.hashDeathReport(requestId, true, 9900);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);

        vm.expectRevert("Signer not a reporter");
        gateway.submitSignedReport(requestId, true, 9900, abi.encodePacked(r, s, v));
    }

    // ── Access control ──

    function testOnlyClaimManagerCanFreeze() public {
        InheritanceVault vault = _fundedVault(1 ether);

        vm.prank(stranger);
        vm.expectRevert("Only claim manager");
        vault.freezeForClaim(beneficiary1);
    }

    function testNonBeneficiaryCannotInitiateClaim() public {
        InheritanceVault vault = _fundedVault(1 ether);

        vm.prank(stranger);
        vm.expectRevert("Not a beneficiary");
        claimManager.initiateClaim(address(vault));
    }

    // ── DeathOracle path: no inactivity precondition ──

    function testOracleTriggerNeedsNoInactivityPeriod() public {
        InheritanceVault vault = _fundedVault(10 ether);

        // Well inside the 365-day inactivity period.
        vm.prank(reporter);
        oracle.requestTrigger(address(vault));

        assertTrue(vault.isTriggered());
        assertTrue(vault.frozen(), "oracle assertion freezes and opens the donor window");
        assertEq(vault.approvalCount(), 1, "oracle alone is 1 of 3");
        assertFalse(vault.isReleaseAuthorized(), "oracle alone must not release");
    }

    function testOracleTriggerPlusBeneficiaryReleases() public {
        InheritanceVault vault = _fundedVault(10 ether);

        vm.prank(reporter);
        oracle.requestTrigger(address(vault));

        vm.prank(beneficiary1);
        vm.expectRevert("Already frozen");
        claimManager.initiateClaim(address(vault));

        // Donor is dead and cannot cancel; the beneficiary supplies the second approval
        // through the vault's own signer set.
        vm.prank(owner);
        vault.donorApprove();

        assertTrue(vault.isReleaseAuthorized());
    }

    // ── Factory auto-wiring ──

    function testFactoryWiresClaimManagerAtCreation() public {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        assertEq(vault.claimManager(), address(claimManager), "vault arrives wired");
        assertEq(vault.oracleAuthority(), oracleAuthority, "oracle authority set too");
    }

    /// @dev The whole point: a fresh vault is claimable and cancellable with no donor setup.
    function testFreshVaultIsImmediatelyProtected() public {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.prank(owner);
        vault.addBeneficiary(beneficiary1, 10000);
        vm.deal(vaultAddr, 5 ether);

        // No setClaimManager call anywhere: a claim can freeze it right away.
        vm.prank(beneficiary1);
        claimManager.initiateClaim(vaultAddr);
        assertTrue(vault.frozen(), "claim freezes a brand new vault");

        // And the donor can cancel it.
        vm.prank(owner);
        vault.donorCancel();
        assertFalse(vault.frozen());
        assertEq(vault.approvalCount(), 0);
    }

    function testDonorCanOverrideFactoryWiring() public {
        vm.prank(owner);
        address vaultAddr = factory.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        vm.prank(owner);
        vault.setClaimManager(stranger);
        assertEq(vault.claimManager(), stranger, "donor keeps final say");
    }

    function testUnwiredFactoryLeavesVaultUnwired() public {
        VaultFactory bare = new VaultFactory(
            address(vaultImpl),
            address(oracle),
            address(0),
            address(0)
        );

        vm.prank(owner);
        address vaultAddr = bare.createVault(365);
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));

        assertEq(vault.claimManager(), address(0));
        // Falls back to the death oracle when no authority is supplied.
        assertEq(vault.oracleAuthority(), address(oracle));
    }

    function testUpdatedDefaultAppliesToNewVaultsOnly() public {
        vm.prank(owner);
        address firstVault = factory.createVault(365);

        factory.updateDefaultClaimManager(stranger);

        vm.prank(owner);
        address secondVault = factory.createVault(365);

        assertEq(
            InheritanceVault(payable(firstVault)).claimManager(),
            address(claimManager),
            "existing vault keeps what it was given"
        );
        assertEq(InheritanceVault(payable(secondVault)).claimManager(), stranger);
    }
}
