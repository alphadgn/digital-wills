/**
 * Encrypted will data layer.
 *
 * Everything sensitive is encrypted in the browser before it leaves the device.
 * The backend only ever stores opaque blobs plus the wrapped key each reader
 * needs, so only the donor and the named beneficiaries can read a will.
 */

import { callFunction } from "@/lib/backendClient";
import {
  decryptWithKey,
  encryptWithKey,
  generateAccessCode,
  generateDocumentKey,
  unwrapDocumentKey,
  wrapDocumentKey,
  type EncryptedPayload,
} from "@/lib/encryption";

export interface WillBeneficiary {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  allocationPercent: number;
  notes?: string;
}

export interface WillContent {
  donorLegalName: string;
  donorDob: string;
  executorInstructions?: string;
  assetNotes?: string;
  personalMessage?: string;
  beneficiaries: WillBeneficiary[];
  updatedAt: string;
}

function toPayload(row: any): EncryptedPayload {
  return {
    ciphertext: row.ciphertext,
    iv: row.iv,
    salt: row.salt,
    algo: "AES-256-GCM",
    version: 1,
  };
}

export interface SaveWillResult {
  /** Access code per beneficiary — shown once to the donor to share privately. */
  accessCodes: Array<{ beneficiaryId: string; name: string; code: string }>;
}

export async function saveWill(
  token: string,
  vaultId: string,
  content: WillContent,
  donorPassphrase: string,
): Promise<SaveWillResult> {
  const docKey = await generateDocumentKey();
  const document = await encryptWithKey(JSON.stringify(content), docKey);
  const donorKey = await wrapDocumentKey(docKey, donorPassphrase);

  const accessCodes: SaveWillResult["accessCodes"] = [];
  const beneficiaryKeys = [];

  for (const b of content.beneficiaries) {
    const code = generateAccessCode();
    beneficiaryKeys.push({
      beneficiaryId: b.id,
      payload: await wrapDocumentKey(docKey, code),
    });
    accessCodes.push({ beneficiaryId: b.id, name: b.name, code });
  }

  await callFunction(
    "will-api",
    {
      action: "SAVE_WILL",
      params: {
        vaultId,
        document,
        donorKey,
        beneficiaryKeys,
        donorLegalName: content.donorLegalName,
        donorDob: content.donorDob,
      },
    },
    token,
  );

  return { accessCodes };
}

export async function loadWill(
  token: string,
  vaultId: string,
  donorPassphrase: string,
): Promise<WillContent | null> {
  const res = await callFunction<{ document: any; donorKey: any }>(
    "will-api",
    { action: "GET_WILL", params: { vaultId } },
    token,
  );
  if (!res?.document || !res?.donorKey) return null;

  const docKey = await unwrapDocumentKey(toPayload(res.donorKey), donorPassphrase);
  return JSON.parse(await decryptWithKey(toPayload(res.document), docKey));
}

export async function loadWillAsBeneficiary(
  token: string,
  vaultId: string,
  accessCode: string,
): Promise<WillContent | null> {
  const res = await callFunction<{ document: any; key: any }>(
    "will-api",
    { action: "GET_WILL_FOR_BENEFICIARY", params: { vaultId } },
    token,
  );
  if (!res?.document || !res?.key) return null;

  const docKey = await unwrapDocumentKey(toPayload(res.key), accessCode);
  return JSON.parse(await decryptWithKey(toPayload(res.document), docKey));
}

export async function getBeneficiaryVaults(token: string) {
  return callFunction<Array<{ vaultId: string; beneficiaryId: string; name: string }>>(
    "will-api",
    { action: "GET_BENEFICIARY_VAULTS", params: {} },
    token,
  );
}
