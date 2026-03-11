# Trustless Digital Inheritance Protocol — Architecture

## Overview

A trustless protocol enabling donors to create on-chain inheritance vaults that distribute digital assets (ETH, ERC20, ERC721) to beneficiaries after verified death, avoiding traditional probate.

## Core Principle

**Dual-vote distribution rule:**
```
beneficiaryVote == true AND oracleVote == true → execute distribution
```

All distribution logic is enforced **on-chain**. The frontend is a convenience layer.

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
│  • Holds ETH/ERC20/ERC721                       │
│  • Owner = donor                                │
│  • ReentrancyGuard + AccessControl              │
│  • Inactivity period tracking                   │
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
| **InheritanceVault** | UUPS-upgradeable vault holding assets. Tracks inactivity, manages beneficiaries. |
| **BeneficiaryRegistry** | On-chain registry of beneficiary allocations per vault. |
| **ClaimManager** | Manages claim lifecycle. Enforces `beneficiaryVote && oracleVote` before execution. |
| **OracleGateway** | Multi-sig oracle aggregator. N-of-M reporters must confirm death verification. |
| **AssetRouter** | Routes ETH, ERC20, ERC721 from vault to beneficiaries by allocation. |
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
3. `beneficiaryVote = true` recorded on-chain
4. Oracle verification triggered
5. OracleGateway aggregates reporter results
6. If `oracleVote == true` (confidence ≥ 0.99):
   - ClaimManager marks VERIFIED
   - Beneficiary calls `executeClaim()`
   - AssetRouter distributes assets by allocation

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
