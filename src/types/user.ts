
export interface UserProfile {
  id: string;
  walletAddress: string;
  beneficiaryWallet: string | null;
  createdAt: string;
  willCreated: boolean;
}
