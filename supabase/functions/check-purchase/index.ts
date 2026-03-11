import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address, email } = await req.json();

    if (!wallet_address && !email) {
      return new Response(
        JSON.stringify({ error: "wallet_address or email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    let query = supabase.from("purchases").select("id, tier").limit(1);

    if (wallet_address) {
      query = query.eq("wallet_address", wallet_address.toLowerCase());
    } else if (email) {
      query = query.eq("email", email.toLowerCase());
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        purchased: !!data,
        tier: data?.tier || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check purchase error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check purchase status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
