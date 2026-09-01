export type VaultStatus = "ACTIVE" | "FROZEN" | "CLAIMED" | "DISTRIBUTED" | "PAUSED";
export type ClaimStatus =
  | "INITIATED"
  | "VERIFICATION_PENDING"
  | "VERIFIED"
  | "DENIED"
  | "EXECUTED"
  | "CANCELLED";
export type AssetType = "ETH" | "ERC20" | "ERC721" | "ERC1155";

/** The three signers on a vault. Two of the three authorize a release. */
export type VaultSigner = "DONOR" | "BENEFICIARY" | "ORACLE";

export interface Vault {
  id: string;
  donorAddress: string;
  contractAddress: string;
  status: VaultStatus;
  totalValueEth: string;
  /** True while a claim is pending or authorized: the donor cannot reconfigure the will. */
  frozen: boolean;
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
  /** Deadline until which the donor may cancel this claim. */
  donorWindowEnds: string | null;
  donorNotifiedAt: string | null;
  cancelledAt: string | null;
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
