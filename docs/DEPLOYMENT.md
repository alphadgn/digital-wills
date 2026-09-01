# Deployment & Operations

What is live, and what has to be done by hand to finish a deployment.

## Current state — Robinhood Chain (4663)

| Contract | Address |
|----------|---------|
| VaultFactory | `0xe5a42C68c42bA87fDa627e0af83281AC145175ac` |
| InheritanceVault (impl) | `0xC2644C70FBBd9059011e6C60211C45EAcB6603c7` |
| ClaimManager | `0xE89C46be71f7BF7dBDA398c719525431C6e7A3Ea` |
| OracleGateway | `0x11850Bb3d719F157C80B28735031fAFAa6BBCdd1` |
| AssetRouter | `0xe3Ab525E4B41c1AB71c879546210416ee5A1EFFf` |
| DeathOracle | `0x85Ba00086F6323c5035a16c0F34f5BC45A6C7734` |

Vaults created by this factory arrive wired to the ClaimManager and oracle authority, so a
donor needs no setup before a claim can freeze the vault or be cancelled.

**Superseded:** an earlier factory (`0xC8780b79c9aafE2A447Ec528A796c2d30635F1ac`, impl
`0xE82734749AC54d5268FbF592eE2a5A0078A17491`) is still on-chain. Vaults it created remain
usable but need `setClaimManager` called once by their donor — the `VaultGovernance` panel
detects this and offers it in one click.

RPC `https://rpc.mainnet.chain.robinhood.com` · explorer `https://robinhoodchain.blockscout.com`

## Outstanding

### 1. Apply the database migration

`supabase/migrations/20260901120000_notifications_and_claim_freeze.sql` adds the
`notifications` table and the claim freeze/cancel columns. **Until it is applied,
`INITIATE_CLAIM` fails** — it writes `donor_window_ends`, which does not yet exist.

```sh
supabase db push          # or apply through the Lovable/Supabase dashboard
```

### 2. Set notification secrets

Without these the donor is never told a claim was filed, which is the only thing that makes
the cancellation window usable. Sends are recorded as `skipped` rather than silently dropped,
so the gap is visible in the `notifications` table.

```sh
supabase secrets set RESEND_API_KEY=... RESEND_FROM="Digital Wills <noreply@yourdomain>"
supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
supabase secrets set APP_ORIGIN=https://yourdomain
```

### 3. Move admin roles to a multisig

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
