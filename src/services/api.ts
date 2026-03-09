/**
 * API service layer — connects to backend API.
 * Replace BASE_URL with your deployed backend.
 */

import type { Vault, Beneficiary, Claim, OracleResult } from "@/types/protocol";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Vaults ──
export const vaultApi = {
  list: (donorAddress: string) =>
    request<Vault[]>(`/vaults?donor=${donorAddress}`),

  get: (vaultId: string) =>
    request<Vault>(`/vaults/${vaultId}`),

  create: (data: { donorAddress: string; contractAddress: string }) =>
    request<Vault>("/vaults", { method: "POST", body: JSON.stringify(data) }),
};

// ── Beneficiaries ──
export const beneficiaryApi = {
  list: (vaultId: string) =>
    request<Beneficiary[]>(`/vaults/${vaultId}/beneficiaries`),

  add: (vaultId: string, data: Omit<Beneficiary, "id" | "vaultId" | "inviteSent" | "inviteAccepted">) =>
    request<Beneficiary>(`/vaults/${vaultId}/beneficiaries`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (vaultId: string, beneficiaryId: string) =>
    request<void>(`/vaults/${vaultId}/beneficiaries/${beneficiaryId}`, {
      method: "DELETE",
    }),

  sendInvite: (vaultId: string, beneficiaryId: string) =>
    request<void>(`/vaults/${vaultId}/beneficiaries/${beneficiaryId}/invite`, {
      method: "POST",
    }),
};

// ── Claims ──
export const claimApi = {
  list: (beneficiaryAddress: string) =>
    request<Claim[]>(`/claims?beneficiary=${beneficiaryAddress}`),

  get: (claimId: string) =>
    request<Claim>(`/claims/${claimId}`),

  initiate: (data: { vaultId: string; beneficiaryAddress: string }) =>
    request<Claim>("/claims", { method: "POST", body: JSON.stringify(data) }),

  getOracleResult: (claimId: string) =>
    request<OracleResult>(`/claims/${claimId}/oracle-result`),
};
