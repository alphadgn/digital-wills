import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIVY_APP_ID = Deno.env.get("VITE_PRIVY_APP_ID") || "";
const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET") || "";
const JWKS = createRemoteJWKSet(new URL("https://auth.privy.io/.well-known/jwks.json"));

interface Identity {
  wallets: string[];
  emails: string[];
}

async function getIdentity(token: string): Promise<Identity> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "privy.io",
    audience: PRIVY_APP_ID,
  });

  const res = await fetch(`https://auth.privy.io/api/v1/users/${payload.sub}`, {
    headers: {
      Authorization: `Basic ${btoa(PRIVY_APP_ID + ":" + PRIVY_APP_SECRET)}`,
      "privy-app-id": PRIVY_APP_ID,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch user from identity provider");

  const user = await res.json();
  const accounts = user.linked_accounts || [];
  return {
    wallets: accounts
      .filter((a: any) => a.type === "wallet" && a.address)
      .map((a: any) => a.address.toLowerCase()),
    emails: accounts
      .filter((a: any) => a.address && (a.type === "email" || a.type === "google_oauth"))
      .map((a: any) => String(a.address).toLowerCase()),
  };
}

/** A validated encrypted blob as produced by the browser's encryption module. */
function assertPayload(p: any, label: string) {
  if (!p || typeof p.ciphertext !== "string" || typeof p.iv !== "string" || typeof p.salt !== "string") {
    throw new Error(`Invalid encrypted payload: ${label}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { wallets, emails } = await getIdentity(authHeader.replace("Bearer ", ""));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, params } = await req.json();
    let result: any;

    const ownsVault = async (vaultId: string) => {
      const { data } = await supabase
        .from("vaults")
        .select("id")
        .eq("id", vaultId)
        .in("wallet_address", wallets)
        .maybeSingle();
      return !!data;
    };

    const beneficiaryRow = async (vaultId: string) => {
      const { data } = await supabase
        .from("vault_beneficiaries")
        .select("*")
        .eq("vault_id", vaultId);
      return (data || []).find(
        (b: any) =>
          (b.wallet_address && wallets.includes(String(b.wallet_address).toLowerCase())) ||
          (b.email && emails.includes(String(b.email).toLowerCase())),
      );
    };

    switch (action) {
      /**
       * Store (or replace) the encrypted will document plus the wrapped document
       * keys — one for the donor, one per beneficiary. The server never receives
       * the document key or any plaintext.
       */
      case "SAVE_WILL": {
        const { vaultId, document, donorKey, beneficiaryKeys, donorLegalName, donorDob } = params;
        if (!(await ownsVault(vaultId))) throw new Error("Vault not found or unauthorized");

        assertPayload(document, "document");
        assertPayload(donorKey, "donorKey");

        const rows = [
          { payload_type: "will_document", ...document },
          { payload_type: "will_key:donor", ...donorKey },
        ];

        for (const bk of beneficiaryKeys || []) {
          assertPayload(bk.payload, `beneficiary ${bk.beneficiaryId}`);
          rows.push({ payload_type: `will_key:${bk.beneficiaryId}`, ...bk.payload });
        }

        await supabase
          .from("encrypted_payloads")
          .delete()
          .eq("vault_id", vaultId)
          .like("payload_type", "will_%");

        const { error } = await supabase.from("encrypted_payloads").insert(
          rows.map((r) => ({
            vault_id: vaultId,
            payload_type: r.payload_type,
            ciphertext: r.ciphertext,
            iv: r.iv,
            salt: r.salt,
            algo: r.algo || "AES-256-GCM",
            version: r.version || 1,
          })),
        );
        if (error) throw error;

        // Legal identity is kept in the clear because the death-record oracle
        // must match it against public registries; nothing else is.
        if (donorLegalName || donorDob) {
          await supabase
            .from("vaults")
            .update({
              donor_legal_name: donorLegalName || null,
              donor_dob: donorDob || null,
            })
            .eq("id", vaultId);
        }

        result = { saved: true, keyCount: rows.length - 1 };
        break;
      }

      /** Donor reads back their own will for editing. */
      case "GET_WILL": {
        const { vaultId } = params;
        if (!(await ownsVault(vaultId))) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("encrypted_payloads")
          .select("*")
          .eq("vault_id", vaultId)
          .in("payload_type", ["will_document", "will_key:donor"]);
        if (error) throw error;

        result = {
          document: data.find((d: any) => d.payload_type === "will_document") || null,
          donorKey: data.find((d: any) => d.payload_type === "will_key:donor") || null,
        };
        break;
      }

      /**
       * Beneficiary access: returns the encrypted will and only the key blob
       * wrapped for this beneficiary. Anyone else gets nothing.
       */
      case "GET_WILL_FOR_BENEFICIARY": {
        const { vaultId } = params;
        const ben = await beneficiaryRow(vaultId);
        if (!ben) throw new Error("Not a beneficiary of this vault");

        const { data, error } = await supabase
          .from("encrypted_payloads")
          .select("*")
          .eq("vault_id", vaultId)
          .in("payload_type", ["will_document", `will_key:${ben.id}`]);
        if (error) throw error;

        result = {
          beneficiaryId: ben.id,
          document: data.find((d: any) => d.payload_type === "will_document") || null,
          key: data.find((d: any) => d.payload_type === `will_key:${ben.id}`) || null,
        };
        break;
      }

      /** Vaults where the caller is a listed beneficiary. */
      case "GET_BENEFICIARY_VAULTS": {
        const { data } = await supabase.from("vault_beneficiaries").select("*");
        const mine = (data || []).filter(
          (b: any) =>
            (b.wallet_address && wallets.includes(String(b.wallet_address).toLowerCase())) ||
            (b.email && emails.includes(String(b.email).toLowerCase())),
        );
        result = mine.map((b: any) => ({ vaultId: b.vault_id, beneficiaryId: b.id, name: b.name }));
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("will-api error:", error);
    return new Response(JSON.stringify({ error: error.message || "Request failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
