/**
 * Claim data layer — routes through the claim-api edge function
 * which verifies the Privy JWT and scopes access to verified wallets.
 */

export interface ClaimRow {
  id: string;
  vault_id: string;
  beneficiary_wallet: string;
  status: "INITIATED" | "VERIFICATION_PENDING" | "VERIFIED" | "DENIED" | "EXECUTED";
  beneficiary_vote: boolean;
  oracle_vote: boolean | null;
  oracle_confidence: number | null;
  created_at: string;
  updated_at: string;
  oracle_results?: OracleResultRow[];
}

export interface OracleResultRow {
  id: string;
  claim_id: string;
  deceased: boolean;
  confidence: number;
  sources: string[];
  matched_name: string | null;
  matched_dob: string | null;
  verified_at: string;
  created_at: string;
}

function getClaimApiUrl() {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-api`;
}

async function claimApiRequest<T>(
  token: string,
  action: string,
  params: Record<string, any> = {}
): Promise<T> {
  const res = await fetch(getClaimApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getMyClaims(token: string): Promise<ClaimRow[]> {
  return claimApiRequest<ClaimRow[]>(token, "GET_CLAIMS");
}

export async function getVaultClaims(token: string, vaultId: string): Promise<ClaimRow[]> {
  return claimApiRequest<ClaimRow[]>(token, "GET_VAULT_CLAIMS", { vaultId });
}

export async function initiateClaim(token: string, vaultId: string): Promise<ClaimRow> {
  return claimApiRequest<ClaimRow>(token, "INITIATE_CLAIM", { vaultId });
}

export async function executeClaim(token: string, claimId: string): Promise<ClaimRow> {
  return claimApiRequest<ClaimRow>(token, "EXECUTE_CLAIM", { claimId });
}
