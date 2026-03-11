import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price IDs
const STANDARD_PRICE_ID = "price_1T9CFl7x3vtVVX3uGTvhEV03"; // $99.95
const MAYC_PRICE_ID = "price_1T9CGC7x3vtVVX3uW6sZRuv1"; // $59.95

const PRIVY_APP_ID = Deno.env.get("VITE_PRIVY_APP_ID") || "";
const JWKS = createRemoteJWKSet(
  new URL("https://auth.privy.io/.well-known/jwks.json")
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller has a valid Privy session (prevents anonymous abuse)
    const authHeader = req.headers.get("Authorization");
    let verifiedEmail: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: "privy.io",
          audience: PRIVY_APP_ID,
        });
        verifiedEmail = (payload as any).email || null;
      } catch {
        // Token invalid — log but allow checkout to proceed for first-time buyers
        console.warn("Privy token verification failed, proceeding as guest checkout");
      }
    }
    // Allow unauthenticated checkout for first-time purchasers (no Privy account yet)
    // but the Stripe session itself provides payment verification

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { tier, email } = await req.json();

    const priceId = tier === "mayc" ? MAYC_PRICE_ID : STANDARD_PRICE_ID;
    const origin = req.headers.get("origin") || "https://digital-wills.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    };

    const customerEmail = verifiedEmail || email;
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
