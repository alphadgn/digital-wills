/**
 * Protocol contract addresses, per chain.
 *
 * Addresses are written here by `npm run sync:addresses` after a deployment, which reads them
 * from the Foundry broadcast log. Do not paste them by hand.
 *
 * Protocol ABIs live in ./abis.ts and are generated from the compiled artifacts
 * (`npm run sync:abis`) — never hand-written.
 */

import { robinhoodChain, apechain } from "./wagmi";

export interface ProtocolAddresses {
  VAULT_FACTORY: `0x${string}`;
  VAULT_IMPLEMENTATION: `0x${string}`;
  DEATH_ORACLE: `0x${string}`;
  ORACLE_GATEWAY: `0x${string}`;
  CLAIM_MANAGER: `0x${string}`;
  ASSET_ROUTER: `0x${string}`;
}

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const UNDEPLOYED: ProtocolAddresses = {
  VAULT_FACTORY: ZERO,
  VAULT_IMPLEMENTATION: ZERO,
  DEATH_ORACLE: ZERO,
  ORACLE_GATEWAY: ZERO,
  CLAIM_MANAGER: ZERO,
  ASSET_ROUTER: ZERO,
};

/** Deployed addresses by chain ID. Populated by scripts/sync-addresses.mjs. */
export const ADDRESSES: Record<number, ProtocolAddresses> = {
  // Robinhood Chain (4663) — deployed.
  4663: {
    VAULT_FACTORY: "0xe5a42C68c42bA87fDa627e0af83281AC145175ac" as `0x${string}`,
    VAULT_IMPLEMENTATION: "0xC2644C70FBBd9059011e6C60211C45EAcB6603c7" as `0x${string}`,
    DEATH_ORACLE: "0x85Ba00086F6323c5035a16c0F34f5BC45A6C7734" as `0x${string}`,
    ORACLE_GATEWAY: "0x11850Bb3d719F157C80B28735031fAFAa6BBCdd1" as `0x${string}`,
    CLAIM_MANAGER: "0xE89C46be71f7BF7dBDA398c719525431C6e7A3Ea" as `0x${string}`,
    ASSET_ROUTER: "0xe3Ab525E4B41c1AB71c879546210416ee5A1EFFf" as `0x${string}`,
  },
  // ApeChain (33139) — later.
  [apechain.id]: { ...UNDEPLOYED },
};

/** Addresses for the chain the app is configured to use. */
export function getAddresses(chainId: number): ProtocolAddresses {
  return ADDRESSES[chainId] ?? UNDEPLOYED;
}

/** True once the protocol has been deployed to this chain. */
export function isDeployed(chainId: number): boolean {
  return getAddresses(chainId).VAULT_FACTORY !== ZERO;
}

export const CONTRACTS = {
  CHAIN_ID: robinhoodChain.id,
  get VAULT_FACTORY() {
    return getAddresses(robinhoodChain.id).VAULT_FACTORY;
  },
  get CLAIM_MANAGER() {
    return getAddresses(robinhoodChain.id).CLAIM_MANAGER;
  },
  get ORACLE_GATEWAY() {
    return getAddresses(robinhoodChain.id).ORACLE_GATEWAY;
  },
} as const;

// ERC-721 minimal ABI for approve + transferFrom
export const ERC721_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// ERC-1155 minimal ABI for safeTransferFrom
export const ERC1155_ABI = [
  {
    name: "safeTransferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;
