/**
 * Claim data layer — routes through the claim-api edge function
 * which verifies the Privy JWT and scopes access to verified wallets.
 */

export interface ClaimRow {
  id: string;
  vault_id: string;
  beneficiary_wallet: string;
  status: "INITIATED" | "VERIFICATION_PENDING" | "VERIFIED" | "DENIED" | "EXECUTED" | "CANCELLED";
  beneficiary_vote: boolean;
  oracle_vote: boolean | null;
  oracle_confidence: number | null;
  created_at: string;
  updated_at: string;
  /** Deadline until which the donor may cancel this claim. */
  donor_window_ends: string | null;
  donor_notified_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  oracle_results?: OracleResultRow[];
}

/** Outcome of one donor notification attempt, returned when a claim is initiated. */
export interface NotificationResult {
  channel: "email" | "sms";
  status: "sent" | "failed" | "skipped";
  providerId: string | null;
  error: string | null;
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

export async function initiateClaim(
  token: string,
  vaultId: string
): Promise<ClaimRow & { notifications: NotificationResult[] }> {
  return claimApiRequest(token, "INITIATE_CLAIM", { vaultId });
}

/**
 * Donor cancels an improper claim while alive.
 *
 * The binding cancellation is `donorCancel()` on the vault contract; this clears the
 * off-chain record and unfreezes the vault row to match.
 */
export async function cancelClaim(token: string, claimId: string): Promise<ClaimRow> {
  return claimApiRequest<ClaimRow>(token, "CANCEL_CLAIM", { claimId });
}

export async function executeClaim(token: string, claimId: string): Promise<ClaimRow> {
  return claimApiRequest<ClaimRow>(token, "EXECUTE_CLAIM", { claimId });
}
