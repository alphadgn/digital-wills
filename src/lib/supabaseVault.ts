/**
 * Vault data layer — all operations route through the vault-api edge function
 * which verifies the Privy JWT and scopes access to verified wallets.
 */

export interface VaultRow {
  id: string;
  wallet_address: string;
  vault_contract_address: string | null;
  vault_name: string;
  chain_id: number;
  status: string;
  inactivity_period_days: number;
  total_value_eth: number;
  donor_email: string | null;
  donor_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryRow {
  id: string;
  vault_id: string;
  name: string;
  wallet_address: string;
  email: string | null;
  allocation_percent: number;
  invite_sent: boolean;
  invite_accepted: boolean;
  invite_token: string | null;
  created_at: string;
}

export interface DepositRow {
  id: string;
  vault_id: string;
  amount_eth: number;
  tx_hash: string;
  from_address: string;
  token_type: string;
  token_address: string | null;
  token_id: string | null;
  created_at: string;
}

function getVaultApiUrl() {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vault-api`;
}

async function vaultApiRequest<T>(
  token: string,
  action: string,
  params: Record<string, any> = {}
): Promise<T> {
  const res = await fetch(getVaultApiUrl(), {
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

// ── Vaults ──

export async function getVaultsForWallet(token: string): Promise<VaultRow[]> {
  return vaultApiRequest<VaultRow[]>(token, "GET_VAULTS");
}

export async function getVaultById(token: string, vaultId: string): Promise<VaultRow> {
  return vaultApiRequest<VaultRow>(token, "GET_VAULT", { vaultId });
}

export async function createVault(
  token: string,
  walletAddress: string,
  vaultContractAddress: string | null,
  vaultName: string = "My Vault"
): Promise<VaultRow> {
  return vaultApiRequest<VaultRow>(token, "CREATE_VAULT", {
    walletAddress,
    vaultContractAddress,
    vaultName,
  });
}

export async function updateVault(
  token: string,
  vaultId: string,
  updates: Partial<Pick<VaultRow, "vault_name" | "status" | "donor_email" | "donor_phone">>
): Promise<VaultRow> {
  return vaultApiRequest<VaultRow>(token, "UPDATE_VAULT", { vaultId, updates });
}

// ── Beneficiaries ──

export async function getVaultBeneficiaries(
  token: string,
  vaultId: string
): Promise<BeneficiaryRow[]> {
  return vaultApiRequest<BeneficiaryRow[]>(token, "GET_BENEFICIARIES", { vaultId });
}

export async function addBeneficiary(
  token: string,
  vaultId: string,
  name: string,
  beneficiaryWallet: string,
  allocationPercent: number,
  email?: string
): Promise<BeneficiaryRow> {
  return vaultApiRequest<BeneficiaryRow>(token, "ADD_BENEFICIARY", {
    vaultId,
    name,
    beneficiaryWallet,
    allocationPercent,
    email,
  });
}

export async function removeBeneficiary(token: string, beneficiaryId: string): Promise<void> {
  await vaultApiRequest(token, "REMOVE_BENEFICIARY", { beneficiaryId });
}

export async function markInviteSent(token: string, beneficiaryId: string): Promise<void> {
  await vaultApiRequest(token, "MARK_INVITE_SENT", { beneficiaryId });
}

// ── Deposits ──

export async function getDepositHistory(
  token: string,
  vaultId: string
): Promise<DepositRow[]> {
  return vaultApiRequest<DepositRow[]>(token, "GET_DEPOSITS", { vaultId });
}

export async function addDeposit(
  token: string,
  vaultId: string,
  txHash: string,
  amountEth: number,
  tokenType: string = "ETH",
  tokenAddress?: string,
  tokenId?: string
) {
  return vaultApiRequest(token, "ADD_DEPOSIT", {
    vaultId,
    txHash,
    amountEth,
    tokenType,
    tokenAddress,
    tokenId,
  });
}

// ── Emergency ──

export async function recordEmergencyAttempt(
  token: string,
  vaultId: string,
  attemptNumber: number,
  success: boolean
) {
  return vaultApiRequest(token, "RECORD_EMERGENCY", {
    vaultId,
    attemptNumber,
    success,
  });
}
