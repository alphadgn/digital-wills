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
const JWKS = createRemoteJWKSet(
  new URL("https://auth.privy.io/.well-known/jwks.json")
);

// Challenge window: 7 days after inactivity threshold before oracle can trigger
const CHALLENGE_WINDOW_DAYS = 7;

async function getVerifiedWallets(token: string): Promise<string[]> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "privy.io",
    audience: PRIVY_APP_ID,
  });
  const userId = payload.sub as string;
  const res = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
    headers: {
      Authorization: `Basic ${btoa(PRIVY_APP_ID + ":" + PRIVY_APP_SECRET)}`,
      "privy-app-id": PRIVY_APP_ID,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  const user = await res.json();
  return (user.linked_accounts || [])
    .filter((a: any) => a.type === "wallet")
    .map((a: any) => a.address.toLowerCase());
}

async function logAudit(
  supabase: any,
  action: string,
  walletAddress: string,
  metadata: Record<string, any> = {}
) {
  await supabase.from("audit_logs").insert({
    action,
    wallet_address: walletAddress,
    metadata,
    ip_address: null,
  });
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

    const token = authHeader.replace("Bearer ", "");
    const wallets = await getVerifiedWallets(token);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, params } = await req.json();
    let result: any;

    switch (action) {
      case "CHECK_IN": {
        // Update last_check_in for the vault
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("liveness_checks")
          .upsert(
            {
              vault_id: params.vaultId,
              wallet_address: wallets[0],
              last_check_in: new Date().toISOString(),
              challenge_issued_at: null,
              challenge_responded: true,
            },
            { onConflict: "vault_id" }
          )
          .select()
          .single();
        if (error) throw error;

        await logAudit(supabase, "LIVENESS_CHECK_IN", wallets[0], {
          vault_id: params.vaultId,
        });

        result = { success: true };
        break;
      }

      case "GET_STATUS": {
        // Get liveness status for all user vaults
        const { data: vaults } = await supabase
          .from("vaults")
          .select("id, inactivity_period_days")
          .in("wallet_address", wallets);

        if (!vaults || vaults.length === 0) {
          result = [];
          break;
        }

        const vaultIds = vaults.map((v: any) => v.id);
        const { data: checks } = await supabase
          .from("liveness_checks")
          .select("*")
          .in("vault_id", vaultIds);

        const now = Date.now();
        result = vaults.map((vault: any) => {
          const check = checks?.find((c: any) => c.vault_id === vault.id);
          const lastCheckin = check?.last_check_in
            ? new Date(check.last_check_in).getTime()
            : now;
          const daysSince = Math.floor((now - lastCheckin) / (1000 * 60 * 60 * 24));
          const threshold = vault.inactivity_period_days;
          const isOverdue = daysSince >= threshold;
          const challengePending =
            check?.challenge_issued_at && !check?.challenge_responded;

          let status = "ACTIVE";
          if (challengePending) status = "CHALLENGE_PENDING";
          else if (isOverdue) status = "EXPIRED";
          else if (daysSince >= threshold * 0.8) status = "WARNING";

          return {
            vault_id: vault.id,
            last_check_in: check?.last_check_in || new Date().toISOString(),
            inactivity_threshold_days: threshold,
            is_overdue: isOverdue,
            days_since_checkin: daysSince,
            challenge_issued_at: check?.challenge_issued_at || null,
            challenge_responded: check?.challenge_responded ?? true,
            status,
          };
        });
        break;
      }

      case "RESPOND_CHALLENGE": {
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { error } = await supabase
          .from("liveness_checks")
          .update({
            challenge_responded: true,
            last_check_in: new Date().toISOString(),
            challenge_issued_at: null,
          })
          .eq("vault_id", params.vaultId);
        if (error) throw error;

        await logAudit(supabase, "CHALLENGE_RESPONDED", wallets[0], {
          vault_id: params.vaultId,
        });

        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Liveness API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Request failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
