export type VaultStatus = "ACTIVE" | "CLAIMED" | "DISTRIBUTED" | "PAUSED";
export type ClaimStatus = "INITIATED" | "VERIFICATION_PENDING" | "VERIFIED" | "DENIED" | "EXECUTED";
export type AssetType = "ETH" | "ERC20" | "ERC721";

export interface Vault {
  id: string;
  donorAddress: string;
  contractAddress: string;
  status: VaultStatus;
  totalValueEth: string;
  createdAt: string;
  updatedAt: string;
}

export interface Beneficiary {
  id: string;
  vaultId: string;
  walletAddress: string;
  name: string;
  allocationPercent: number;
  inviteSent: boolean;
  inviteAccepted: boolean;
}

export interface Claim {
  id: string;
  vaultId: string;
  beneficiaryAddress: string;
  status: ClaimStatus;
  beneficiaryVote: boolean;
  oracleVote: boolean | null;
  oracleConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OracleResult {
  id: string;
  claimId: string;
  deceased: boolean;
  confidence: number;
  sources: string[];
  verifiedAt: string;
}

export interface DepositedAsset {
  type: AssetType;
  contractAddress?: string;
  tokenId?: string;
  amount: string;
  symbol: string;
}

export interface ProtocolUser {
  privyUserId: string;
  walletAddress: string;
  createdAt: string;
  role: "donor" | "beneficiary";
}
