/**
 * Diagnostic: checks whether the notification providers are actually usable.
 * Never returns secret values — only presence and provider verdicts.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
  const RESEND_FROM = Deno.env.get("RESEND_FROM") || "";
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") || "";
  const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "";

  const out: Record<string, unknown> = {};

  // ── Resend ──
  if (!RESEND_API_KEY) {
    out.resend = { configured: false, verdict: "missing RESEND_API_KEY" };
  } else {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    const body = await r.text();
    let domains: string[] = [];
    try {
      domains = (JSON.parse(body).data ?? []).map((d: any) => `${d.name} (${d.status})`);
    } catch { /* ignore */ }
    out.resend = {
      configured: true,
      keyValid: r.ok,
      status: r.status,
      domains,
      detail: r.ok ? null : body.slice(0, 300),
    };
  }

  const fromMatch = RESEND_FROM.match(/<?([^<>\s]+@[^<>\s]+)>?\s*$/);
  out.resend_from = {
    set: !!RESEND_FROM,
    domain: fromMatch ? fromMatch[1].split("@")[1] : null,
  };

  // ── Twilio ──
  if (!SID || !TOKEN || !FROM_NUMBER) {
    out.twilio = { configured: false, verdict: "unset — SMS recorded as skipped" };
  } else {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}.json`, {
      headers: { Authorization: `Basic ${btoa(`${SID}:${TOKEN}`)}` },
    });
    out.twilio = {
      configured: true,
      credsValid: r.ok,
      status: r.status,
      fromLooksLikeE164: /^\+[1-9]\d{6,14}$/.test(FROM_NUMBER),
      detail: r.ok ? null : (await r.text()).slice(0, 200),
    };
  }

  // ── App origin ──
  out.app_origin = {
    set: !!APP_ORIGIN,
    valid: /^https?:\/\/[^\s]+$/.test(APP_ORIGIN) && !APP_ORIGIN.endsWith("/"),
    value: APP_ORIGIN,
  };

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
