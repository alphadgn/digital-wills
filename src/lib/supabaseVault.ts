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
  created_at: string;
  updated_at: string;
}

/**
 * Since we use wallet-based auth (Privy) not Supabase auth,
 * RLS policies check x-wallet-address header. We set global headers per call.
 * Note: For proper RLS with custom headers, we use supabase rest API directly.
 * For now, we use the service with anon key and pass wallet via filter.
 * 
 * Since RLS uses custom headers which the JS client doesn't easily support,
 * we'll use direct REST calls to the PostgREST API.
 */

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

export async function getVaultBeneficiaries(walletAddress: string, vaultId: string) {
  const res = await fetch(`${getRestUrl()}/vault_beneficiaries?vault_id=eq.${vaultId}&order=created_at.asc`, {
    headers: getHeaders(walletAddress),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDepositHistory(walletAddress: string, vaultId: string) {
  const res = await fetch(`${getRestUrl()}/deposit_history?vault_id=eq.${vaultId}&order=created_at.desc`, {
    headers: getHeaders(walletAddress),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addDeposit(walletAddress: string, vaultId: string, txHash: string, amountEth: number) {
  const res = await fetch(`${getRestUrl()}/deposit_history`, {
    method: "POST",
    headers: { ...getHeaders(walletAddress), "Accept": "application/vnd.pgrst.object+json" },
    body: JSON.stringify({
      vault_id: vaultId,
      tx_hash: txHash,
      amount_eth: amountEth,
      from_address: walletAddress.toLowerCase(),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
