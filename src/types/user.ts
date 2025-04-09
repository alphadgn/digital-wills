
export interface UserProfile {
  id: string;
  walletAddress: string;
  beneficiaryWallet: string | null;
  createdAt: string;
  willCreated: boolean;
  communicationPreference?: {
    method: "email" | "phone" | null;
    value: string | null;
  };
  donorSSN?: string | null;
  claimProcessed?: boolean;
}
