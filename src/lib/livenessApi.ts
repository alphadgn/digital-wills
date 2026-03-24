/**
 * Liveness / Dead-Man Switch API layer
 * 
 * Tracks donor check-ins and exposes status for the oracle trigger system.
 * The oracle only triggers vault distribution after:
 *   1. Inactivity threshold exceeded
 *   2. Challenge window elapsed without response
 *   3. Oracle confirms death verification
 */

function getLivenessApiUrl() {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/liveness-api`;
}

async function livenessRequest<T>(
  token: string,
  action: string,
  params: Record<string, any> = {}
): Promise<T> {
  const res = await fetch(getLivenessApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Liveness request failed: ${res.status}`);
  }
  return res.json();
}

export interface LivenessStatus {
  vault_id: string;
  last_check_in: string;
  inactivity_threshold_days: number;
  is_overdue: boolean;
  days_since_checkin: number;
  challenge_issued_at: string | null;
  challenge_responded: boolean;
  status: "ACTIVE" | "WARNING" | "CHALLENGE_PENDING" | "EXPIRED";
}

/** Record a liveness check-in for a vault */
export async function checkIn(token: string, vaultId: string): Promise<{ success: boolean }> {
  return livenessRequest(token, "CHECK_IN", { vaultId });
}

/** Get liveness status for all user's vaults */
export async function getLivenessStatus(token: string): Promise<LivenessStatus[]> {
  return livenessRequest(token, "GET_STATUS");
}

/** Respond to a challenge (proves the donor is alive) */
export async function respondToChallenge(token: string, vaultId: string): Promise<{ success: boolean }> {
  return livenessRequest(token, "RESPOND_CHALLENGE", { vaultId });
}
