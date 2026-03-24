/**
 * Client-Side Encryption Module
 * 
 * AES-256-GCM encryption for all sensitive will data.
 * Keys are derived from the user's Privy wallet — the server
 * never sees plaintext will content or encryption keys.
 */

const ALGO = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 310_000; // OWASP recommendation

// ── Key Derivation ──

/**
 * Derive an AES-256 key from a wallet signature (acts as password).
 * The signature is obtained by having the user sign a deterministic message
 * with their Privy-managed wallet.
 */
export async function deriveKeyFromSignature(
  signature: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(signature),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const usedSalt = salt ?? crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: usedSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );

  return { key, salt: usedSalt };
}

// ── Encrypt / Decrypt ──

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded IV */
  iv: string;
  /** Base64-encoded salt used for key derivation */
  salt: string;
  /** Algorithm identifier for forward compatibility */
  algo: "AES-256-GCM";
  /** Version for payload format migration */
  version: 1;
}

/**
 * Encrypt arbitrary data with AES-256-GCM.
 * Returns a self-contained payload that can be stored as-is in the database.
 */
export async function encryptData(
  plaintext: string,
  encryptionKey: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    encryptionKey,
    enc.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    algo: "AES-256-GCM",
    version: 1,
  };
}

/**
 * Decrypt an EncryptedPayload back to plaintext.
 */
export async function decryptData(
  payload: EncryptedPayload,
  signature: string
): Promise<string> {
  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);

  const { key } = await deriveKeyFromSignature(signature, new Uint8Array(salt));

  const plainBuffer = await crypto.subtle.decrypt(
    { name: ALGO, iv: new Uint8Array(iv) },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBuffer);
}

// ── Deterministic Signing Message ──

/**
 * The message the user signs to derive their encryption key.
 * Deterministic so the same key is derived on every session.
 */
export const ENCRYPTION_SIGN_MESSAGE =
  "Sign this message to unlock your encrypted vault data.\n\n" +
  "This signature is used locally to derive your encryption key.\n" +
  "It is never sent to any server.\n\n" +
  "App: Digital Will Protocol\n" +
  "Purpose: Vault Data Encryption";

// ── Helpers ──

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ── Convenience: Encrypt a will document ──

export interface WillDocument {
  beneficiaries: Array<{
    name: string;
    walletAddress: string;
    allocationPercent: number;
    notes?: string;
  }>;
  personalMessage?: string;
  triggerConditions?: string;
  metadata?: Record<string, string>;
}

export async function encryptWillDocument(
  doc: WillDocument,
  signature: string
): Promise<EncryptedPayload> {
  const { key, salt } = await deriveKeyFromSignature(signature);
  return encryptData(JSON.stringify(doc), key, salt);
}

export async function decryptWillDocument(
  payload: EncryptedPayload,
  signature: string
): Promise<WillDocument> {
  const json = await decryptData(payload, signature);
  return JSON.parse(json);
}
