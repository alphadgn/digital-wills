import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a Supabase client call with the wallet address header for RLS.
 * Since we use wallet-based auth (Privy) rather than Supabase auth,
 * we pass the wallet address via a custom header for RLS policies.
 */
function withWalletHeader(walletAddress: string) {
  return supabase.headers({ "x-wallet-address": walletAddress });
}

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

export async function getVaultsForWallet(walletAddress: string) {
  const { data, error } = await withWalletHeader(walletAddress)
    .from("vaults")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as VaultRow[];
}

export async function getVaultById(walletAddress: string, vaultId: string) {
  const { data, error } = await withWalletHeader(walletAddress)
    .from("vaults")
    .select("*")
    .eq("id", vaultId)
    .single();
  if (error) throw error;
  return data as VaultRow;
}

export async function createVault(walletAddress: string, vaultContractAddress: string | null, vaultName: string = "My Vault") {
  const { data, error } = await withWalletHeader(walletAddress)
    .from("vaults")
    .insert({
      wallet_address: walletAddress.toLowerCase(),
      vault_contract_address: vaultContractAddress,
      vault_name: vaultName,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VaultRow;
}

export async function getVaultBeneficiaries(walletAddress: string, vaultId: string) {
  const { data, error } = await withWalletHeader(walletAddress)
    .from("vault_beneficiaries")
    .select("*")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getDepositHistory(walletAddress: string, vaultId: string) {
  const { data, error } = await withWalletHeader(walletAddress)
    .from("deposit_history")
    .select("*")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addDeposit(walletAddress: string, vaultId: string, txHash: string, amountEth: number) {
  const { data, error } = await withWalletHeader(walletAddress)
    .from("deposit_history")
    .insert({
      vault_id: vaultId,
      tx_hash: txHash,
      amount_eth: amountEth,
      from_address: walletAddress.toLowerCase(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
