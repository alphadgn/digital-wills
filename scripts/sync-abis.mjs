#!/usr/bin/env node
/**
 * Generate src/config/abis.ts from the compiled Foundry artifacts.
 *
 * The frontend ABIs were previously hand-written and had drifted into describing a contract
 * that does not exist — calls would have reverted against the real vault. Generating them
 * from `contracts/out` makes that class of bug impossible: run this after any contract change.
 *
 *   npm run sync:abis
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = join(root, "contracts", "out");
const outFile = join(root, "src", "config", "abis.ts");

// Contracts the frontend talks to, and the export name each gets.
const TARGETS = [
  ["VaultFactory", "VAULT_FACTORY_ABI"],
  ["InheritanceVault", "INHERITANCE_VAULT_ABI"],
  ["ClaimManager", "CLAIM_MANAGER_ABI"],
  ["OracleGateway", "ORACLE_GATEWAY_ABI"],
];

function loadAbi(name) {
  const path = join(artifactDir, `${name}.sol`, `${name}.json`);
  if (!existsSync(path)) {
    throw new Error(
      `Missing artifact ${path}\nRun \`forge build\` in contracts/ first.`,
    );
  }
  const artifact = JSON.parse(readFileSync(path, "utf8"));
  // Drop constructor/fallback/receive noise; keep functions, events and errors.
  return artifact.abi.filter((e) =>
    ["function", "event", "error"].includes(e.type),
  );
}

const banner = `// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Produced from the compiled Foundry artifacts in contracts/out by scripts/sync-abis.mjs.
// Regenerate with:  npm run sync:abis
//
// Editing this file by hand is how the ABIs previously drifted out of sync with the
// deployed contracts. Change the Solidity, rebuild, and re-run the generator instead.
`;

let body = banner;
for (const [contract, exportName] of TARGETS) {
  const abi = loadAbi(contract);
  body += `\n/** ${contract}.sol */\nexport const ${exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
}

writeFileSync(outFile, body, "utf8");

const summary = TARGETS.map(([c]) => {
  const abi = loadAbi(c);
  return `  ${c}: ${abi.filter((e) => e.type === "function").length} functions, ${abi.filter((e) => e.type === "event").length} events`;
}).join("\n");

console.log(`Wrote ${outFile}\n${summary}`);
