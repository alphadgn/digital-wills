import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { notifyDonorOfClaim } from "../_shared/notify.ts";

// Days the donor has to cancel an improper claim. Mirrors InheritanceVault.DEFAULT_DONOR_WINDOW.
const DONOR_WINDOW_DAYS = 7;

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
      case "GET_CLAIMS": {
        // Get claims where the user is a beneficiary
        const { data, error } = await supabase
          .from("claims")
          .select("*, oracle_results(*)")
          .in("beneficiary_wallet", wallets)
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case "GET_VAULT_CLAIMS": {
        // Get claims for a vault the user owns
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("claims")
          .select("*, oracle_results(*)")
          .eq("vault_id", params.vaultId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case "INITIATE_CLAIM": {
        // Verify the caller is a beneficiary of this vault
        const { data: benRows } = await supabase
          .from("vault_beneficiaries")
          .select("id, vault_id")
          .eq("vault_id", params.vaultId)
          .in("wallet_address", wallets);
        if (!benRows || benRows.length === 0) {
          throw new Error("Not a beneficiary of this vault");
        }

        // Check for existing active claim
        const { data: existing } = await supabase
          .from("claims")
          .select("id")
          .eq("vault_id", params.vaultId)
          .in("beneficiary_wallet", wallets)
          .in("status", ["INITIATED", "VERIFICATION_PENDING", "VERIFIED"]);
        if (existing && existing.length > 0) {
          throw new Error("Active claim already exists");
        }

        const donorWindowEnds = new Date(
          Date.now() + DONOR_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();

        const { data, error } = await supabase
          .from("claims")
          .insert({
            vault_id: params.vaultId,
            beneficiary_wallet: wallets[0],
            status: "INITIATED",
            beneficiary_vote: true,
            donor_window_ends: donorWindowEnds,
          })
          .select()
          .single();
        if (error) throw error;

        // Freeze the vault record alongside the on-chain freeze.
        await supabase
          .from("vaults")
          .update({ frozen: true, frozen_at: new Date().toISOString() })
          .eq("id", params.vaultId);

        // Tell the donor. Their ability to cancel while alive depends on this message,
        // so the outcome is recorded and returned rather than fired and forgotten.
        const { data: vaultRow } = await supabase
          .from("vaults")
          .select("donor_email, donor_phone")
          .eq("id", params.vaultId)
          .single();

        const notifications = await notifyDonorOfClaim(
          supabase,
          params.vaultId,
          { donor_email: vaultRow?.donor_email, donor_phone: vaultRow?.donor_phone },
          wallets[0],
          donorWindowEnds,
        );

        if (notifications.some((n) => n.status === "sent")) {
          await supabase
            .from("claims")
            .update({ donor_notified_at: new Date().toISOString() })
            .eq("id", data.id);
        }

        result = { ...data, notifications };
        break;
      }

      case "CANCEL_CLAIM": {
        // Donor cancels an improper claim while alive. Scoped to vaults the caller owns.
        const { data: claim } = await supabase
          .from("claims")
          .select("*, vaults!inner(id, wallet_address)")
          .eq("id", params.claimId)
          .single();
        if (!claim) throw new Error("Claim not found");

        const donorWallet = (claim.vaults?.wallet_address || "").toLowerCase();
        if (!wallets.includes(donorWallet)) {
          throw new Error("Only the donor can cancel a claim");
        }
        if (!["INITIATED", "VERIFICATION_PENDING"].includes(claim.status)) {
          throw new Error("Claim is no longer cancellable");
        }

        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("claims")
          .update({
            status: "CANCELLED",
            cancelled_at: now,
            cancelled_by: donorWallet,
          })
          .eq("id", params.claimId)
          .select()
          .single();
        if (error) throw error;

        // Cancellation unfreezes the vault and is itself proof of life.
        await supabase
          .from("vaults")
          .update({ frozen: false, frozen_at: null })
          .eq("id", claim.vault_id);

        await supabase
          .from("liveness_checks")
          .update({ last_check_in: now, challenge_responded: true })
          .eq("vault_id", claim.vault_id);

        result = data;
        break;
      }

      case "SUBMIT_ORACLE_RESULT": {
        // This is an internal/admin action — in production, locked to oracle service
        const { data: claim } = await supabase
          .from("claims")
          .select("*")
          .eq("id", params.claimId)
          .single();
        if (!claim) throw new Error("Claim not found");

        const deceased = params.deceased as boolean;
        const confidence = params.confidence as number;
        const minConfidence = 0.99;

        // Insert oracle result
        const { error: orErr } = await supabase
          .from("oracle_results")
          .insert({
            claim_id: params.claimId,
            deceased,
            confidence,
            sources: params.sources || [],
            matched_name: params.matchedName || null,
            matched_dob: params.matchedDob || null,
          });
        if (orErr) throw orErr;

        // Update claim status
        const newStatus =
          deceased && confidence >= minConfidence ? "VERIFIED" : "DENIED";
        const { data, error } = await supabase
          .from("claims")
          .update({
            status: newStatus,
            oracle_vote: deceased && confidence >= minConfidence,
            oracle_confidence: confidence,
          })
          .eq("id", params.claimId)
          .select()
          .single();
        if (error) throw error;

        // Death could not be verified: unfreeze and leave the assets with the donor.
        if (newStatus === "DENIED") {
          await supabase
            .from("vaults")
            .update({ frozen: false, frozen_at: null })
            .eq("id", claim.vault_id);
        }

        result = data;
        break;
      }

      case "EXECUTE_CLAIM": {
        const { data: claim } = await supabase
          .from("claims")
          .select("*")
          .eq("id", params.claimId)
          .eq("status", "VERIFIED")
          .in("beneficiary_wallet", wallets)
          .single();
        if (!claim) throw new Error("No verified claim found");
        if (!claim.beneficiary_vote || !claim.oracle_vote) {
          throw new Error("Dual vote required: beneficiary AND oracle");
        }

        const { data, error } = await supabase
          .from("claims")
          .update({ status: "EXECUTED" })
          .eq("id", params.claimId)
          .select()
          .single();
        if (error) throw error;

        // Update vault status
        await supabase
          .from("vaults")
          .update({ status: "DISTRIBUTED" })
          .eq("id", claim.vault_id);

        result = data;
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
    console.error("Claim API error:", error);
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: error.message || "Request failed" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
