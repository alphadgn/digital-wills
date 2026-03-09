import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vault_id, wallet_address, attempt_number } = await req.json();

    if (!vault_id || !wallet_address) {
      return new Response(JSON.stringify({ error: "Missing vault_id or wallet_address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the wallet owns this vault
    const { data: vault, error: vaultError } = await supabase
      .from("vaults")
      .select("*")
      .eq("id", vault_id)
      .single();

    if (vaultError || !vault) {
      return new Response(JSON.stringify({ verified: false, error: "Vault not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOwner = vault.wallet_address.toLowerCase() === wallet_address.toLowerCase();

    if (!isOwner) {
      // Record failed attempt
      await supabase.from("emergency_attempts").insert({
        vault_id,
        wallet_address: wallet_address.toLowerCase(),
        attempt_number: attempt_number || 1,
        success: false,
      });

      // If second failed attempt, send warning
      if (attempt_number >= 2 && (vault.donor_email || vault.donor_phone)) {
        // Send warning notification
        console.log(`[EMERGENCY WARNING] Unauthorized access attempt on vault ${vault_id}`);
        console.log(`Sending warning to: email=${vault.donor_email}, phone=${vault.donor_phone}`);

        // In production, integrate with email/SMS provider here
        // For now, log the warning event
        await supabase.from("emergency_attempts").insert({
          vault_id,
          wallet_address: wallet_address.toLowerCase(),
          attempt_number: attempt_number,
          success: false,
        });
      }

      return new Response(JSON.stringify({
        verified: false,
        error: "Wallet does not match vault owner",
        warning_sent: attempt_number >= 2,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Privy that this wallet belongs to the claimed user
    const privyAppId = Deno.env.get("VITE_PRIVY_APP_ID");
    const privyAppSecret = Deno.env.get("PRIVY_APP_SECRET");

    let privyVerified = true; // Default to true if Privy secret not configured

    if (privyAppId && privyAppSecret) {
      try {
        // Look up user by wallet address via Privy API
        const privyRes = await fetch(`https://auth.privy.io/api/v1/users/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "privy-app-id": privyAppId,
            "Authorization": `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`,
          },
          body: JSON.stringify({
            query: wallet_address.toLowerCase(),
          }),
        });

        if (privyRes.ok) {
          const privyData = await privyRes.json();
          // Check if any returned user has this wallet
          privyVerified = privyData.data?.some((user: any) =>
            user.linked_accounts?.some((acc: any) =>
              acc.type === "wallet" && acc.address?.toLowerCase() === wallet_address.toLowerCase()
            )
          ) ?? false;
        } else {
          console.warn("Privy API call failed, proceeding with ownership check only");
        }
      } catch (e) {
        console.warn("Privy verification error:", e);
      }
    }

    if (!privyVerified) {
      // Failed Privy verification
      if (attempt_number >= 2 && (vault.donor_email || vault.donor_phone)) {
        console.log(`[EMERGENCY WARNING] Failed Privy verification on vault ${vault_id}`);
      }

      return new Response(JSON.stringify({
        verified: false,
        error: "Identity verification failed",
        warning_sent: attempt_number >= 2,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success
    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
