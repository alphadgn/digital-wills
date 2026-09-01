#!/usr/bin/env node
/**
 * Write deployed contract addresses into src/config/contracts.ts from the Foundry
 * broadcast log, so nobody has to paste an address by hand.
 *
 *   npm run sync:addresses -- 4663
 *
 * Reads every contracts/broadcast/<script>/<chainId>/run-latest.json, which Foundry writes
 * only on a real `--broadcast` run, and applies them oldest-first so a targeted redeploy
 * supersedes the original. Dry runs land in a `dry-run/` subdirectory and are ignored here
 * on purpose: a simulated address is not a deployed one.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getAddress } from "viem";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const chainId = process.argv[2];
if (!chainId) {
  console.error("Usage: npm run sync:addresses -- <chainId>   (e.g. 4663)");
  process.exit(1);
}

const broadcastRoot = join(root, "contracts", "broadcast");

if (!existsSync(broadcastRoot)) {
  console.error(
    `No broadcast directory at ${broadcastRoot}
` +
      `Deploy first:
` +
      `  cd contracts && forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast`,
  );
  process.exit(1);
}

// A chain can be deployed to by more than one script - a full Deploy, then a targeted
// redeploy of the contracts that changed. Read every log for this chain and apply them
// oldest-first, so the most recent deployment of each contract is the one that sticks.
// Reading only Deploy.s.sol silently reinstated superseded addresses.
const logs = readdirSync(broadcastRoot)
  .map((scriptDir) => join(broadcastRoot, scriptDir, chainId, "run-latest.json"))
  .filter((f) => existsSync(f))
  .map((f) => ({ file: f, json: JSON.parse(readFileSync(f, "utf8")) }))
  .sort((a, b) => (a.json.timestamp ?? 0) - (b.json.timestamp ?? 0));

if (logs.length === 0) {
  console.error(
    `No broadcast log for chain ${chainId} under ${broadcastRoot}
` +
      `Dry runs are ignored on purpose: a simulated address is not a deployed one.`,
  );
  process.exit(1);
}

// Map the contract name Foundry records to the key used in ProtocolAddresses.
const KEY_FOR = {
  VaultFactory: "VAULT_FACTORY",
  InheritanceVault: "VAULT_IMPLEMENTATION",
  DeathOracle: "DEATH_ORACLE",
  OracleGateway: "ORACLE_GATEWAY",
  ClaimManager: "CLAIM_MANAGER",
  AssetRouter: "ASSET_ROUTER",
};

// The UUPS contracts are deployed as an implementation followed by an ERC1967Proxy. The
// address the app must call is the proxy, so a later proxy claims the key of the
// implementation that precedes it.
const PROXIED = new Set(["OracleGateway", "ClaimManager", "AssetRouter"]);

const found = {};

for (const { json } of logs) {
  let lastImpl = null;

  for (const tx of json.transactions ?? []) {
    if (tx.transactionType !== "CREATE" && tx.transactionType !== "CREATE2") continue;
    const name = tx.contractName;
    const address = tx.contractAddress;
    if (!address) continue;

    if (name === "ERC1967Proxy" && lastImpl && PROXIED.has(lastImpl)) {
      found[KEY_FOR[lastImpl]] = address;
      lastImpl = null;
      continue;
    }

    if (KEY_FOR[name]) {
      // Later logs overwrite earlier ones: a redeploy supersedes the original.
      found[KEY_FOR[name]] = address;
      lastImpl = name;
    }
  }
}

if (Object.keys(found).length === 0) {
  console.error("No contract deployments found in the broadcast log.");
  process.exit(1);
}

const configPath = join(root, "src", "config", "contracts.ts");
const config = readFileSync(configPath, "utf8");

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

// The broadcast log stores addresses lowercase; emit the EIP-55 checksummed form.
const block = [
  `  ${chainId}: {`,
  ...Object.values(KEY_FOR).map((key) => {
    const addr = found[key] ?? ZERO_ADDR;
    return `    ${key}: "${getAddress(addr)}" as \`0x\${string}\`,`;
  }),
  `  },`,
].join("\n");

// Replace this chain's entry line-by-line rather than with a regex: the generated block
// contains `${string}` template braces, which defeat naive brace matching and made a
// second run fail to find the entry it had just written.
const lines = config.split("\n");

const entryStart = new RegExp(String.raw`^\s*(?:\[[^\]]+\]|` + chainId + String.raw`):\s*\{`);
let startIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (!entryStart.test(lines[i])) continue;
  // Match either the literal chain id, or a placeholder whose comment names this chain.
  if (lines[i].includes(`${chainId}:`) || (lines[i - 1] ?? "").includes(`(${chainId})`)) {
    startIdx = i;
    break;
  }
}

if (startIdx === -1) {
  console.error(
    `Could not find an ADDRESSES entry for chain ${chainId} in contracts.ts.\n` +
      `Add one manually, then re-run.`,
  );
  process.exit(1);
}

// The `{ ...UNDEPLOYED }` placeholder closes on its own line; a written block does not.
let endIdx = startIdx;
if (!lines[startIdx].trimEnd().endsWith("},")) {
  while (endIdx < lines.length && !/^\s*\},\s*$/.test(lines[endIdx])) endIdx++;
}

// The placeholder comment says deployment is pending. It no longer is.
const prev = lines[startIdx - 1] ?? "";
if (prev.includes("deployment pending")) {
  lines[startIdx - 1] = prev.replace(/—.*$/, "— deployed.");
}

lines.splice(startIdx, endIdx - startIdx + 1, block);
writeFileSync(configPath, lines.join("\n"), "utf8");

console.log(
  `Updated ${configPath} for chain ${chainId} from ${logs.length} broadcast log(s):`,
);
for (const [key, addr] of Object.entries(found)) {
  console.log(`  ${key}: ${getAddress(addr)}`);
}
