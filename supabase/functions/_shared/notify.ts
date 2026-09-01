/**
 * Donor notification transport.
 *
 * When a beneficiary initiates an inheritance claim the vault freezes and the donor must be
 * told, because the donor's ability to cancel an improper claim while alive depends entirely
 * on that message arriving. Every attempt is recorded in `notifications` so the audit trail
 * shows what was sent, to which channel, and whether it was delivered.
 *
 * Providers are read from the environment. If a provider is unconfigured the send is recorded
 * with status "skipped" rather than silently dropped, so a missing key is visible in the audit
 * trail instead of looking like a delivered message.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Digital Wills <noreply@digitalwills.io>";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") || "";

/**
 * Placeholder Twilio values are as good as unset — treating them as configured would
 * turn every SMS into a failed delivery attempt instead of an honest "skipped".
 */
const TWILIO_READY = /^AC[0-9a-f]{32}$/i.test(TWILIO_ACCOUNT_SID) &&
  TWILIO_AUTH_TOKEN.length >= 32 &&
  /^\+[1-9]\d{6,14}$/.test(TWILIO_FROM_NUMBER);

// Trailing slashes would produce double-slashed cancellation links.
const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") || "https://digitalwills.io").replace(/\/+$/, "");

export type NotificationChannel = "email" | "sms";
export type NotificationStatus = "sent" | "failed" | "skipped";

export interface NotificationResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  providerId: string | null;
  error: string | null;
}

// ── Providers ──

async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<NotificationResult> {
  if (!RESEND_API_KEY) {
    return {
      channel: "email",
      status: "skipped",
      providerId: null,
      error: "RESEND_API_KEY not configured",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      return {
        channel: "email",
        status: "failed",
        providerId: null,
        error: `Resend ${res.status}: ${await res.text()}`,
      };
    }

    const data = await res.json();
    return { channel: "email", status: "sent", providerId: data.id ?? null, error: null };
  } catch (e) {
    return {
      channel: "email",
      status: "failed",
      providerId: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function sendSms(to: string, body: string): Promise<NotificationResult> {
  if (!TWILIO_READY) {
    return {
      channel: "sms",
      status: "skipped",
      providerId: null,
      error: "Twilio credentials not configured",
    };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body }),
      },
    );

    if (!res.ok) {
      return {
        channel: "sms",
        status: "failed",
        providerId: null,
        error: `Twilio ${res.status}: ${await res.text()}`,
      };
    }

    const data = await res.json();
    return { channel: "sms", status: "sent", providerId: data.sid ?? null, error: null };
  } catch (e) {
    return {
      channel: "sms",
      status: "failed",
      providerId: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ── Messages ──

function claimNotice(vaultId: string, beneficiaryWallet: string, windowEnds: string) {
  const shortWallet = `${beneficiaryWallet.slice(0, 6)}...${beneficiaryWallet.slice(-4)}`;
  const cancelUrl = `${APP_ORIGIN}/vault/${vaultId}`;

  const subject = "Action required: an inheritance claim was filed on your Digital Will";
  const text = [
    "An inheritance claim has been initiated against your Digital Will.",
    "",
    `Vault: ${vaultId}`,
    `Claim filed by: ${shortWallet}`,
    `You can cancel until: ${windowEnds}`,
    "",
    "Your vault is now frozen and death verification has begun. No assets can be released",
    "unless death is verified and the vault's 2-of-3 authorization is satisfied.",
    "",
    "If you are reading this, you are alive and this claim is improper. Cancel it here:",
    cancelUrl,
    "",
    "Cancelling clears the claim, unfreezes your vault and records proof of life.",
    "",
    "If you did not expect this message, cancel the claim and review who you have",
    "designated as a beneficiary.",
  ].join("\n");

  const sms =
    `Digital Wills: an inheritance claim was filed on your vault by ${shortWallet}. ` +
    `Your vault is frozen. If you are alive, cancel it before ${windowEnds}: ${cancelUrl}`;

  return { subject, text, sms };
}

function emergencyNotice(vaultId: string, walletAddress: string, attemptNumber: number) {
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const url = `${APP_ORIGIN}/vault/${vaultId}`;

  const subject = "Security alert: repeated failed access attempts on your Digital Will";
  const text = [
    "Someone has repeatedly failed to verify access to your Digital Will vault.",
    "",
    `Vault: ${vaultId}`,
    `Attempting wallet: ${shortWallet}`,
    `Failed attempts: ${attemptNumber}`,
    "",
    "No assets have been released. Review your vault:",
    url,
  ].join("\n");

  const sms =
    `Digital Wills security alert: ${attemptNumber} failed access attempts on your vault ` +
    `from ${shortWallet}. No assets released. ${url}`;

  return { subject, text, sms };
}

// ── Public API ──

interface DonorContact {
  donor_email?: string | null;
  donor_phone?: string | null;
}

/**
 * Deliver a message to every contact method the donor has on file, and record each attempt.
 *
 * @param supabase Service-role client, used to write the audit rows.
 */
async function deliver(
  supabase: any,
  vaultId: string,
  kind: string,
  contact: DonorContact,
  message: { subject: string; text: string; sms: string },
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (contact.donor_email) {
    results.push(await sendEmail(contact.donor_email, message.subject, message.text));
  }
  if (contact.donor_phone) {
    results.push(await sendSms(contact.donor_phone, message.sms));
  }

  if (results.length === 0) {
    results.push({
      channel: "email",
      status: "skipped",
      providerId: null,
      error: "No donor contact method on file",
    });
  }

  // Audit every attempt, including the ones that were skipped.
  const rows = results.map((r) => ({
    vault_id: vaultId,
    kind,
    channel: r.channel,
    status: r.status,
    provider_id: r.providerId,
    error: r.error,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("Failed to record notification audit rows:", error.message);
  }

  return results;
}

/** Notify the donor that a beneficiary has filed a claim and the vault is frozen. */
export async function notifyDonorOfClaim(
  supabase: any,
  vaultId: string,
  contact: DonorContact,
  beneficiaryWallet: string,
  windowEnds: string,
): Promise<NotificationResult[]> {
  const message = claimNotice(vaultId, beneficiaryWallet, windowEnds);
  return await deliver(supabase, vaultId, "CLAIM_INITIATED", contact, message);
}

/** Notify the donor of repeated failed emergency-access attempts. */
export async function notifyDonorOfEmergencyAttempt(
  supabase: any,
  vaultId: string,
  contact: DonorContact,
  walletAddress: string,
  attemptNumber: number,
): Promise<NotificationResult[]> {
  const message = emergencyNotice(vaultId, walletAddress, attemptNumber);
  return await deliver(supabase, vaultId, "EMERGENCY_ATTEMPT", contact, message);
}
