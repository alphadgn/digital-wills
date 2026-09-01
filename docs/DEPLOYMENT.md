# Deployment & Operations

What is live, and what has to be done by hand to finish a deployment.

## Current state — Robinhood Chain (4663)

| Contract | Address | Status |
|----------|---------|--------|
| VaultFactory | `0xC8780b79c9aafE2A447Ec528A796c2d30635F1ac` | live, **pre-auto-wiring** |
| InheritanceVault (impl) | `0xE82734749AC54d5268FbF592eE2a5A0078A17491` | live, **old initializer** |
| ClaimManager | `0xE89C46be71f7BF7dBDA398c719525431C6e7A3Ea` | live, current |
| OracleGateway | `0x11850Bb3d719F157C80B28735031fAFAa6BBCdd1` | live, current |
| AssetRouter | `0xe3Ab525E4B41c1AB71c879546210416ee5A1EFFf` | live, current |
| DeathOracle | `0x85Ba00086F6323c5035a16c0F34f5BC45A6C7734` | live, current |

RPC `https://rpc.mainnet.chain.robinhood.com` · explorer `https://robinhoodchain.blockscout.com`

## Outstanding

### 1. Redeploy the factory (needs gas)

The live factory predates auto-wiring, so its vaults require the donor to call
`setClaimManager` once before a claim can freeze them. `RedeployFactory.s.sol` replaces the
vault implementation and factory only — the other four contracts are reused by address.

```sh
# fund the deployer first: ~0.0035 ETH covers ~5.0M gas with headroom
cd contracts
forge script script/RedeployFactory.s.sol --rpc-url robinhood            # simulate
forge script script/RedeployFactory.s.sol --rpc-url robinhood --broadcast
cd .. && npm run sync:addresses -- 4663
```

Requires `DEPLOYER_KEY`, `CLAIM_MANAGER`, `ORACLE_GATEWAY` and `DEATH_ORACLE` in the
environment. Foundry reads `.env` from the directory `forge` runs in, so keep a gitignored
copy at `contracts/.env` or run from the repo root.

Existing vaults keep working throughout; this only changes what *new* vaults get.

### 2. Apply the database migration

`supabase/migrations/20260901120000_notifications_and_claim_freeze.sql` adds the
`notifications` table and the claim freeze/cancel columns. **Until it is applied,
`INITIATE_CLAIM` fails** — it writes `donor_window_ends`, which does not yet exist.

```sh
supabase db push          # or apply through the Lovable/Supabase dashboard
```

### 3. Set notification secrets

Without these the donor is never told a claim was filed, which is the only thing that makes
the cancellation window usable. Sends are recorded as `skipped` rather than silently dropped,
so the gap is visible in the `notifications` table.

```sh
supabase secrets set RESEND_API_KEY=... RESEND_FROM="Digital Wills <noreply@yourdomain>"
supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
supabase secrets set APP_ORIGIN=https://yourdomain
```

### 4. Move admin roles to a multisig

The deployer key currently holds `DEFAULT_ADMIN_ROLE` on `ClaimManager` and `OracleGateway`,
owns `VaultFactory`, and is the **sole oracle reporter at threshold 1**. One key can therefore
assert a death. Before the protocol holds anything of value, grant these roles to a multisig
and raise the reporter threshold.

## Regenerating frontend bindings

Never hand-edit `src/config/abis.ts` or the addresses in `src/config/contracts.ts`.

```sh
cd contracts && forge build && cd ..
npm run sync:abis                 # ABIs from contracts/out
npm run sync:addresses -- 4663    # addresses from the broadcast log
```

`sync:addresses` reads `broadcast/Deploy.s.sol/<chain>/run-latest.json`, which Foundry writes
only on a real `--broadcast` run — dry runs are deliberately ignored, since a simulated address
is not a deployed one.

## Local checks

```sh
cd contracts && forge test        # 32 tests
npx tsc --noEmit -p tsconfig.app.json
npm run build
cd supabase/functions && deno check */index.ts _shared/notify.ts
```

## Secrets

`.env` is gitignored and untracked; the repo is public. `contracts/cache/` holds Foundry's
"sensitive values" and `contracts/broadcast/` the transaction log — both are gitignored.
Never commit a private key, and prefer a throwaway deployer funded with only enough gas.
