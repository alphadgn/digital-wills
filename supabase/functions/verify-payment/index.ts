import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAYC_PRICE_ID = "price_1T9CGC7x3vtVVX3uW6sZRuv1";
const PRIVY_APP_ID = Deno.env.get("VITE_PRIVY_APP_ID") || "";
const PRIVY_APP_SECRET = Deno.env.get("PRIVY_APP_SECRET") || "";
const JWKS = createRemoteJWKSet(
  new URL("https://auth.privy.io/.well-known/jwks.json")
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Determine tier from line items
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
    const priceId = lineItems.data[0]?.price?.id;
    const tier = priceId === MAYC_PRICE_ID ? "mayc" : "standard";

    // Derive wallet address from verified Privy JWT if present (don't trust client)
    let walletAddress: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: "privy.io",
          audience: PRIVY_APP_ID,
        });
        const userId = payload.sub as string;

        // Fetch user's wallets from Privy
        const userRes = await fetch(
          `https://auth.privy.io/api/v1/users/${userId}`,
          {
            headers: {
              Authorization: `Basic ${btoa(PRIVY_APP_ID + ":" + PRIVY_APP_SECRET)}`,
              "privy-app-id": PRIVY_APP_ID,
            },
          }
        );
        if (userRes.ok) {
          const user = await userRes.json();
          const wallet = (user.linked_accounts || []).find(
            (a: any) => a.type === "wallet"
          );
          if (wallet) walletAddress = wallet.address.toLowerCase();
        }
      } catch {
        // JWT verification failed — proceed without wallet
      }
    }

    // Record purchase using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const email =
      session.customer_email ||
      session.customer_details?.email ||
      null;

    await supabase.from("purchases").upsert(
      {
        stripe_session_id: session_id,
        wallet_address: walletAddress,
        email,
        tier,
      },
      { onConflict: "stripe_session_id" }
    );

    return new Response(JSON.stringify({ success: true, tier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
