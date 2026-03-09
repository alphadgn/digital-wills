// Contract addresses — replace with deployed addresses
export const CONTRACTS = {
  VAULT_FACTORY: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  CHAIN_ID: 33139, // ApeChain
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
  {
    name: "addBeneficiary",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "allocation", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "removeBeneficiary",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "beneficiary", type: "address" }],
    outputs: [],
  },
  {
    name: "emergencyWithdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "destination", type: "address" }],
    outputs: [],
  },
] as const;
