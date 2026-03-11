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

async function getVerifiedWallets(token: string): Promise<string[]> {
  // Verify the Privy JWT signature and claims
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "privy.io",
    audience: PRIVY_APP_ID,
  });

  const userId = payload.sub as string;

  // Fetch user's linked wallets from Privy API
  const res = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
    headers: {
      Authorization: `Basic ${btoa(PRIVY_APP_ID + ":" + PRIVY_APP_SECRET)}`,
      "privy-app-id": PRIVY_APP_ID,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user from identity provider");
  }

  const user = await res.json();
  const wallets = (user.linked_accounts || [])
    .filter((a: any) => a.type === "wallet")
    .map((a: any) => a.address.toLowerCase());

  if (wallets.length === 0) {
    throw new Error("No wallets linked to your account");
  }

  return wallets;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify Privy JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const wallets = await getVerifiedWallets(token);

    // Create service-role Supabase client (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, params } = await req.json();
    let result: any;

    switch (action) {
      case "GET_VAULTS": {
        const { data, error } = await supabase
          .from("vaults")
          .select("*")
          .in("wallet_address", wallets)
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case "GET_VAULT": {
        const { data, error } = await supabase
          .from("vaults")
          .select("*")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "CREATE_VAULT": {
        const addr = params.walletAddress?.toLowerCase();
        if (!wallets.includes(addr)) {
          throw new Error("Wallet not linked to your account");
        }
        const { data, error } = await supabase
          .from("vaults")
          .insert({
            wallet_address: addr,
            vault_contract_address: params.vaultContractAddress || null,
            vault_name: params.vaultName || "My Vault",
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "UPDATE_VAULT": {
        const { data, error } = await supabase
          .from("vaults")
          .update(params.updates)
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "GET_BENEFICIARIES": {
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("vault_beneficiaries")
          .select("*")
          .eq("vault_id", params.vaultId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        result = data;
        break;
      }

      case "ADD_BENEFICIARY": {
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("vault_beneficiaries")
          .insert({
            vault_id: params.vaultId,
            name: params.name,
            wallet_address: params.beneficiaryWallet.toLowerCase(),
            allocation_percent: params.allocationPercent,
            invite_token: crypto.randomUUID(),
            email: params.email || null,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "REMOVE_BENEFICIARY": {
        const { data: ben } = await supabase
          .from("vault_beneficiaries")
          .select("vault_id")
          .eq("id", params.beneficiaryId)
          .single();
        if (!ben) throw new Error("Beneficiary not found");

        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", ben.vault_id)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Unauthorized");

        const { error } = await supabase
          .from("vault_beneficiaries")
          .delete()
          .eq("id", params.beneficiaryId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "MARK_INVITE_SENT": {
        const { data: ben } = await supabase
          .from("vault_beneficiaries")
          .select("vault_id")
          .eq("id", params.beneficiaryId)
          .single();
        if (!ben) throw new Error("Beneficiary not found");

        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", ben.vault_id)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Unauthorized");

        const { error } = await supabase
          .from("vault_beneficiaries")
          .update({ invite_sent: true })
          .eq("id", params.beneficiaryId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "GET_DEPOSITS": {
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("deposit_history")
          .select("*")
          .eq("vault_id", params.vaultId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }

      case "ADD_DEPOSIT": {
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("deposit_history")
          .insert({
            vault_id: params.vaultId,
            tx_hash: params.txHash,
            amount_eth: params.amountEth,
            from_address: wallets[0],
            token_type: params.tokenType || "ETH",
            token_address: params.tokenAddress || null,
            token_id: params.tokenId || null,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "RECORD_EMERGENCY": {
        const { data: vault } = await supabase
          .from("vaults")
          .select("id")
          .eq("id", params.vaultId)
          .in("wallet_address", wallets)
          .single();
        if (!vault) throw new Error("Vault not found or unauthorized");

        const { data, error } = await supabase
          .from("emergency_attempts")
          .insert({
            vault_id: params.vaultId,
            wallet_address: wallets[0],
            attempt_number: params.attemptNumber,
            success: params.success,
          })
          .select()
          .single();
        if (error) throw error;
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
    console.error("Vault API error:", error);
    const status = error.message?.includes("Unauthorized") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: "Request failed" }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
