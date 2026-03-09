// Contract addresses — replace with deployed addresses
export const CONTRACTS = {
  VAULT_FACTORY: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  CHAIN_ID: 33139, // ApeChain
} as const;

// Minimal ABIs for frontend interaction — replace with full ABIs after deployment
export const VAULT_FACTORY_ABI = [
  {
    name: "createVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "beneficiaries", type: "address[]" },
      { name: "allocations", type: "uint256[]" },
    ],
    outputs: [{ name: "vaultAddress", type: "address" }],
  },
  {
    name: "VaultCreated",
    type: "event",
    inputs: [
      { name: "donor", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: false },
    ],
  },
] as const;

export const INHERITANCE_VAULT_ABI = [
  {
    name: "initiateClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "submitOracleVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "deceased", type: "bool" }],
    outputs: [],
  },
  {
    name: "distribute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "getVaultState",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "beneficiaryVote", type: "bool" },
      { name: "oracleVote", type: "bool" },
      { name: "isDistributed", type: "bool" },
      { name: "totalEth", type: "uint256" },
    ],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;
