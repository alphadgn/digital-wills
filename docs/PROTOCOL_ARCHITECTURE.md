# Trustless Digital Inheritance Protocol — Architecture

## Overview

A trustless protocol enabling donors to create on-chain inheritance vaults that distribute digital
assets (ETH, ERC-20, ERC-721, ERC-1155) to beneficiaries after verified death, avoiding traditional
probate.

The product specification is the About page copy (`src/pages/About.tsx`), which is the source of
truth for the protocol's behaviour. [Implementation Status](#implementation-status) maps each
claim in that copy to the code that enforces it and the test that covers it.

## Core Principle

```
No verified death. No inheritance release.
```

Assets sit in a **2-of-3 multi-signature vault** governed by three parties:

| Party | Role |
|-------|------|
| **Donor** | Owns the assets. Retains full control while alive, including changing the beneficiary. |
| **Beneficiary** | Designated recipient. May initiate a claim, but cannot access the vault alone. |
| **Oracle Authority** | Independent verification system that confirms death through approved sources. |

**Distribution rule:**
```
beneficiaryVote == true AND oracleVote == true → execute distribution
```

A beneficiary-initiated claim **freezes the vault** and starts verification. The donor is notified
via their selected email or SMS contact method and can cancel an improper claim while alive. If
death cannot be verified, assets remain locked. If it is verified, the oracle records its signed
decision on-chain and the contracts release assets to the beneficiary.

The platform never takes custody. Sensitive identity information stays off-chain; the chain holds an
auditable history of vault and inheritance events. All distribution logic is enforced **on-chain**
— the frontend is a convenience layer.

---

## Smart Contract Architecture

```
┌─────────────────────────────────────────────────┐
│                  VaultFactory                    │
│   Deploys ERC1967 proxies of InheritanceVault   │
└────────────────────┬────────────────────────────┘
                     │ deploys
                     ▼
┌─────────────────────────────────────────────────┐
│              InheritanceVault (UUPS)             │
│  • Holds ETH/ERC20/ERC721/ERC1155               │
│  • Owner = donor                                │
│  • 2-of-3 signers: donor/beneficiary/oracle     │
│  • Freeze on claim + donor cancellation         │
│  • ReentrancyGuard + AccessControl              │
└──────┬──────────┬──────────┬────────────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│Beneficiary│ │  Claim   │ │   Oracle     │
│ Registry │ │ Manager  │ │  Gateway     │
│          │ │          │ │              │
│ On-chain │ │ Dual-vote│ │ Multi-sig    │
│ allocat. │ │ enforce  │ │ reporter     │
└──────────┘ └──────────┘ └──────────────┘
                              │
                              ▼
                     ┌──────────────┐
                     │ AssetRouter  │
                     │              │
                     │ ETH/ERC20/   │
                     │ ERC721 dist. │
                     └──────────────┘

┌─────────────────────────────────────────────────┐
│              EmergencyPause                      │
│  Protocol-level + per-vault pause control       │
│  Guardian role for emergency stops              │
└─────────────────────────────────────────────────┘
```

### Contract Descriptions

| Contract | Purpose |
|----------|---------|
| **VaultFactory** | Deploys new vault proxies via `CREATE2`. Stores implementation address. |
| **InheritanceVault** | UUPS-upgradeable 2-of-3 vault holding ETH, ERC-20, ERC-721 and ERC-1155. Owns the approval set, freeze state and donor cancellation. |
| **BeneficiaryRegistry** | On-chain registry of beneficiary allocations per vault. |
| **ClaimManager** | Manages claim lifecycle. Freezes the vault on initiation, relays both votes, and moves assets on execution. |
| **OracleGateway** | Multi-sig oracle aggregator. N-of-M reporters confirm via stored EIP-712 signatures. |
| **AssetRouter** | Routes ETH, ERC-20, ERC-721 and ERC-1155 from vault to beneficiaries by allocation. |
| **EmergencyPause** | Protocol-wide and per-vault pause control via guardian role. |
| **DeathOracle** | Legacy oracle with direct reporter confirmation (used by VaultFactory). |

### Security Features

- **OpenZeppelin**: ReentrancyGuard, AccessControl, Pausable, UUPS
- **Checks-Effects-Interactions** pattern in all transfers
- **Reentrancy protection** on all distribution paths
- **Multi-sig oracle** prevents single point of failure
- **Inactivity period** prevents premature distribution
- **Emergency pause** for protocol-level incidents

---

## Implementation Status

The spec above is implemented. Each claim in the About copy maps to enforced behaviour and a
covering test in `contracts/test/InheritanceVault.t.sol`:

| Spec claim | Implementation | Test |
|------------|----------------|------|
| **2-of-3 multi-signature vault** | `InheritanceVault` holds a three-signer approval set (`DONOR`, `BENEFICIARY`, `ORACLE`) and releases only at `REQUIRED_APPROVALS = 2`. A beneficiary claim alone is 1 of 3 and releases nothing. | `testSingleApprovalDoesNotAuthorizeRelease`, `testBeneficiaryPlusOracleAuthorizesRelease`, `testDonorPlusBeneficiaryAuthorizesRelease` |
| **Claim freezes the vault** | `freezeForClaim()` sets `frozen`, records the beneficiary approval and opens the donor window. While frozen the donor cannot reconfigure the will. | `testClaimFreezesVault`, `testFrozenVaultBlocksDonorReconfiguration` |
| **Donor notified by email / SMS** | `supabase/functions/_shared/notify.ts` sends over Resend (email) and Twilio (SMS). Every attempt — including one skipped for a missing provider key — is recorded in `notifications`. | — (off-chain) |
| **Donor can cancel an improper claim** | `donorCancel()` clears every approval, unfreezes the vault and records proof of life. Available until the 2-of-3 threshold is met. | `testDonorCancelsImproperClaim`, `testDonorCancelRecordsProofOfLife`, `testOnlyDonorCanCancel`, `testDonorCannotCancelAfterAuthorization` |
| **ERC-1155 support** | The vault holds ERC-721 and ERC-1155 via OZ holder hooks and releases all four asset types; `AssetRouter.distributeERC1155` added. | `testVaultHoldsAndReleasesERC1155`, `testVaultHoldsAndReleasesERC20`, `testVaultHoldsAndReleasesERC721` |
| **Oracle records a signed decision on-chain** | `OracleGateway.submitSignedReport()` recovers an EIP-712 signature, requires the signer to hold `REPORTER_ROLE`, and stores the signature in `reportSignatures`. Any address may relay; authorship comes from the signature. | `testSignedReportRecordedOnChain`, `testSignedReportRejectsNonReporter` |
| **No verified death, no release** | A denied or low-confidence verification unfreezes the vault and leaves assets untouched. | `testUnverifiedDeathLocksAssets`, `testLowConfidenceIsNotVerification` |
| **Assets actually move** | `ClaimManager.executeClaim()` calls `vault.releaseTo()`. The ETH balance is snapshotted at authorization, so a later claimant is not shortchanged by an earlier withdrawal. | `testExecuteClaimTransfersEth`, `testAllocationsSplitProRata` |

### Resolved design conflicts

- **Donor veto vs. 2-of-3.** In a plain 2-of-3, beneficiary + oracle could release over a living
  donor's objection. The donor veto is therefore time-boxed to the pending window: while a claim
  is pending the donor may cancel it outright, and cancellation is itself the proof of life that
  denies the claim. Once the threshold is met the authorization is final.
- **Inactivity as a release gate.** `triggerVault()` no longer requires the inactivity period to
  have elapsed — a verified death would otherwise wait on a dead-man clock the spec never
  mentions. `inactivityPeriod` and `lastActivity` remain as liveness telemetry. Eligibility comes
  from verification; authorization from the 2-of-3 threshold.
- **DeathOracle path.** `triggerVault()` records the ORACLE approval and freezes the vault rather
  than releasing on its own, so the legacy oracle route obeys the same threshold.

### Operational requirements

- Vaults arrive wired: `VaultFactory` passes its `defaultClaimManager` and
  `defaultOracleAuthority` into `initialize()`, because `setClaimManager` is `onlyOwner` and the
  donor owns the vault — the factory cannot supply it afterwards. Donors may still re-point a
  vault with `setClaimManager`, or opt out at creation with `createVaultWithConfig(...)`.
  Vaults created by an earlier factory revision still need wiring by hand; the `VaultGovernance`
  panel detects that and offers it in one click.
- Notification providers are read from the environment: `RESEND_API_KEY`, `RESEND_FROM`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `APP_ORIGIN`. Unset keys make
  sends record as `skipped` rather than silently succeed.
- Contract dependencies are vendored via `forge install` and gitignored; run it after a fresh
  clone. See `contracts/remappings.txt`.

### Deployed addresses — Robinhood Chain (4663)

| Contract | Address |
|----------|---------|
| VaultFactory | `0xC8780b79c9aafE2A447Ec528A796c2d30635F1ac` |
| ClaimManager | `0xE89C46be71f7BF7dBDA398c719525431C6e7A3Ea` |
| OracleGateway | `0x11850Bb3d719F157C80B28735031fAFAa6BBCdd1` |
| AssetRouter | `0xe3Ab525E4B41c1AB71c879546210416ee5A1EFFf` |
| DeathOracle | `0x85Ba00086F6323c5035a16c0F34f5BC45A6C7734` |
| InheritanceVault (impl) | `0xE82734749AC54d5268FbF592eE2a5A0078A17491` |

Frontend addresses are generated from the broadcast log with `npm run sync:addresses -- 4663`;
ABIs come from the compiled artifacts with `npm run sync:abis`. Neither is written by hand — the
previous hand-maintained ABIs had drifted into describing functions the contracts never had.

**The deployed factory predates auto-wiring.** Its vaults need `setClaimManager` called once by
the donor. Redeploying `InheritanceVault` and `VaultFactory` (via `script/RedeployFactory.s.sol`,
which reuses the other four contracts) replaces that with vaults that arrive ready to use.

### Known limitations

- `EmergencyPause` and `BeneficiaryRegistry` are deployed but not yet consulted by the vault.
- The deployer key holds `DEFAULT_ADMIN_ROLE` on `ClaimManager` and `OracleGateway`, owns
  `VaultFactory`, and is the sole oracle reporter at threshold 1. A single key therefore controls
  death verification; move these roles to a multisig before real assets are held.
- `AssetRouter` distribution is available but the vault releases tokens directly; the router path
  is not yet wired into `ClaimManager.executeClaim`, which settles ETH only.
- Token release is per-asset and caller-driven — there is no single call that sweeps every token
  a vault holds.

---

## Database Schema

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    vaults    │────▶│vault_beneficiaries│     │   purchases  │
│              │     │                  │     │              │
│ id           │     │ vault_id (FK)    │     │ wallet_addr  │
│ wallet_addr  │     │ wallet_address   │     │ stripe_sess  │
│ contract_addr│     │ allocation_%     │     │ tier         │
│ status       │     │ invite_token     │     └──────────────┘
│ total_value  │     └──────────────────┘
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────────┐
│    claims    │────▶│  oracle_results  │
│              │     │                  │
│ vault_id(FK) │     │ claim_id (FK)    │
│ beneficiary  │     │ deceased         │
│ status       │     │ confidence       │
│ ben_vote     │     │ sources[]        │
│ oracle_vote  │     │ matched_name     │
│ confidence   │     │ matched_dob      │
└──────────────┘     └──────────────────┘

┌──────────────┐     ┌──────────────────┐
│deposit_history│     │emergency_attempts│
│              │     │                  │
│ vault_id(FK) │     │ vault_id (FK)    │
│ tx_hash      │     │ wallet_address   │
│ amount_eth   │     │ attempt_number   │
│ token_type   │     │ success          │
└──────────────┘     └──────────────────┘
```

**Database stores metadata only. Smart contracts are the source of truth for asset distribution.**

---

## Authentication

- **Privy** wallet + email authentication
- Identity: `privy_user_id` + `wallet_address`
- No Supabase `auth.uid()` — all access scoped via Privy JWT verification
- Edge functions verify JWT → fetch linked wallets → scope queries

---

## Flows

### Vault Creation
1. Donor connects wallet (Privy)
2. Donor defines beneficiaries + allocations
3. VaultFactory deploys InheritanceVault proxy
4. Vault address stored in database
5. Donor deposits ETH/ERC20/ERC721

### Claim Flow
1. Beneficiary connects wallet
2. Beneficiary initiates claim via ClaimManager
3. `beneficiaryVote = true` recorded on-chain; vault is frozen and the donor window opens
4. Donor notified via email or SMS; while alive they may cancel, which clears every approval
5. Oracle verification triggered
6. OracleGateway aggregates reporter results
7. If `oracleVote == true` (confidence ≥ 0.99):
   - The oracle approval is recorded on the vault, meeting the 2-of-3 threshold
   - ClaimManager marks VERIFIED and snapshots the releasable balance
   - `executeClaim()` calls `vault.releaseTo()`, moving the beneficiary's allocation
8. If death cannot be verified, the claim is DENIED, the vault unfreezes and assets remain locked

### Oracle Verification Engine
1. Collects death records from trusted sources:
   - Social Security Death Index (SSDI)
   - State vital records registries
   - Obituary aggregation services
   - Government death certificate APIs
2. Matches identity fields: name, DOB
3. Computes confidence score (0.0–1.0)
4. Minimum threshold: **0.99**
5. Returns boolean `deceased` result

---

## Project Structure

```
/
├── contracts/               # Foundry smart contracts
│   ├── src/
│   │   ├── InheritanceVault.sol
│   │   ├── VaultFactory.sol
│   │   ├── BeneficiaryRegistry.sol
│   │   ├── ClaimManager.sol
│   │   ├── OracleGateway.sol
│   │   ├── AssetRouter.sol
│   │   ├── EmergencyPause.sol
│   │   └── DeathOracle.sol
│   ├── script/Deploy.s.sol
│   ├── test/InheritanceVault.t.sol
│   └── foundry.toml
├── src/                     # React frontend
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabaseVault.ts  # Vault data layer
│   │   └── claimApi.ts       # Claim data layer
│   ├── pages/
│   └── types/
├── supabase/
│   └── functions/
│       ├── vault-api/        # Vault CRUD (Privy JWT auth)
│       ├── claim-api/        # Claim lifecycle (Privy JWT auth)
│       ├── oracle-verify/    # Oracle verification engine
│       ├── check-purchase/   # Purchase status check
│       ├── create-checkout/  # Stripe checkout
│       ├── verify-payment/   # Payment verification
│       ├── stripe-webhook/   # Stripe webhook handler
│       └── emergency-verify/ # Emergency verification
└── docs/
    └── PROTOCOL_ARCHITECTURE.md
```

---

## Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `vault-api` | Privy JWT | Vault CRUD, beneficiary management, deposits |
| `claim-api` | Privy JWT | Claim initiation, execution, status queries |
| `oracle-verify` | Service | Death verification engine |
| `check-purchase` | Privy JWT | Check purchase status for payment gate bypass |
| `create-checkout` | Optional | Create Stripe checkout session |
| `verify-payment` | Privy JWT | Verify Stripe payment |
| `stripe-webhook` | Stripe sig | Server-side payment confirmation |
| `emergency-verify` | Privy JWT | Emergency access verification |

---

## Security Model

1. **Zero-trust data access**: All DB operations via authenticated edge functions
2. **Identity derivation**: Wallet addresses derived from verified Privy JWTs
3. **On-chain enforcement**: Distribution logic lives in smart contracts, not frontend
4. **Multi-sig oracle**: No single reporter can trigger distribution
5. **Emergency pause**: Protocol-level kill switch for incidents
6. **ReentrancyGuard**: All value transfer functions protected
7. **UUPS upgradeable**: Contracts can be upgraded via owner multisig
8. **No custody**: The platform never holds donor assets; vaults are donor-owned contracts
9. **Donor control while alive**: Beneficiaries and allocations remain editable until the vault is triggered
10. **Off-chain identity**: Sensitive identity fields never touch the chain; only vault and claim events do
