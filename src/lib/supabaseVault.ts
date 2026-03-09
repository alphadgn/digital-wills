import { supabase } from "@/integrations/supabase/client";

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

function getRestUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return `${url}/rest/v1`;
}

function getHeaders(walletAddress: string) {
  return {
    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    "x-wallet-address": walletAddress.toLowerCase(),
  };
}

// ── Vaults ──

export async function getVaultsForWallet(walletAddress: string): Promise<VaultRow[]> {
  const res = await fetch(`${getRestUrl()}/vaults?order=created_at.desc`, {
    headers: getHeaders(walletAddress),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getVaultById(walletAddress: string, vaultId: string): Promise<VaultRow> {
  const res = await fetch(`${getRestUrl()}/vaults?id=eq.${vaultId}`, {
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createVault(walletAddress: string, vaultContractAddress: string | null, vaultName: string = "My Vault"): Promise<VaultRow> {
  const res = await fetch(`${getRestUrl()}/vaults`, {
    method: "POST",
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
    body: JSON.stringify({
      wallet_address: walletAddress.toLowerCase(),
      vault_contract_address: vaultContractAddress,
      vault_name: vaultName,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateVault(walletAddress: string, vaultId: string, updates: Partial<Pick<VaultRow, 'vault_name' | 'status' | 'donor_email' | 'donor_phone'>>): Promise<VaultRow> {
  const res = await fetch(`${getRestUrl()}/vaults?id=eq.${vaultId}`, {
    method: "PATCH",
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Beneficiaries ──

export async function getVaultBeneficiaries(walletAddress: string, vaultId: string): Promise<BeneficiaryRow[]> {
  const res = await fetch(`${getRestUrl()}/vault_beneficiaries?vault_id=eq.${vaultId}&order=created_at.asc`, {
    headers: getHeaders(walletAddress),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addBeneficiary(
  walletAddress: string,
  vaultId: string,
  name: string,
  beneficiaryWallet: string,
  allocationPercent: number
): Promise<BeneficiaryRow> {
  const inviteToken = crypto.randomUUID();
  const res = await fetch(`${getRestUrl()}/vault_beneficiaries`, {
    method: "POST",
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
    body: JSON.stringify({
      vault_id: vaultId,
      name,
      wallet_address: beneficiaryWallet.toLowerCase(),
      allocation_percent: allocationPercent,
      invite_token: inviteToken,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeBeneficiary(walletAddress: string, beneficiaryId: string): Promise<void> {
  const res = await fetch(`${getRestUrl()}/vault_beneficiaries?id=eq.${beneficiaryId}`, {
    method: "DELETE",
    headers: getHeaders(walletAddress),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function markInviteSent(walletAddress: string, beneficiaryId: string): Promise<void> {
  const res = await fetch(`${getRestUrl()}/vault_beneficiaries?id=eq.${beneficiaryId}`, {
    method: "PATCH",
    headers: getHeaders(walletAddress),
    body: JSON.stringify({ invite_sent: true }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Deposits ──

export async function getDepositHistory(walletAddress: string, vaultId: string): Promise<DepositRow[]> {
  const res = await fetch(`${getRestUrl()}/deposit_history?vault_id=eq.${vaultId}&order=created_at.desc`, {
    headers: getHeaders(walletAddress),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addDeposit(
  walletAddress: string,
  vaultId: string,
  txHash: string,
  amountEth: number,
  tokenType: string = "ETH",
  tokenAddress?: string,
  tokenId?: string
) {
  const res = await fetch(`${getRestUrl()}/deposit_history`, {
    method: "POST",
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
    body: JSON.stringify({
      vault_id: vaultId,
      tx_hash: txHash,
      amount_eth: amountEth,
      from_address: walletAddress.toLowerCase(),
      token_type: tokenType,
      token_address: tokenAddress || null,
      token_id: tokenId || null,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Emergency ──

export async function recordEmergencyAttempt(
  walletAddress: string,
  vaultId: string,
  attemptNumber: number,
  success: boolean
) {
  const res = await fetch(`${getRestUrl()}/emergency_attempts`, {
    method: "POST",
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
    body: JSON.stringify({
      vault_id: vaultId,
      wallet_address: walletAddress.toLowerCase(),
      attempt_number: attemptNumber,
      success,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
