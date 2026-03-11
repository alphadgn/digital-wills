import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Oracle Verification Engine
 * 
 * Simulates death record verification from multiple trusted sources.
 * In production, this would integrate with:
 * - Social Security Death Index (SSDI)
 * - State vital records registries
 * - Obituary aggregation services
 * - Government death certificate APIs
 * 
 * The engine:
 * 1. Collects records from multiple sources
 * 2. Matches identity fields (name, DOB)
 * 3. Computes a confidence score
 * 4. Returns boolean deceased result
 * 
 * Minimum confidence threshold: 0.99
 */

interface VerificationRequest {
  claimId: string;
  donorName: string;
  donorDob: string; // YYYY-MM-DD
  donorIdentifiers?: Record<string, string>; // additional identity fields
}

interface SourceResult {
  source: string;
  found: boolean;
  confidence: number;
  matchedName: boolean;
  matchedDob: boolean;
}

const MIN_CONFIDENCE = 0.99;
const REQUIRED_SOURCES = 2; // minimum sources that must confirm

function simulateSourceCheck(
  source: string,
  donorName: string,
  donorDob: string
): SourceResult {
  // In production, this calls real APIs
  // For now, returns a simulated result
  return {
    source,
    found: false,
    confidence: 0,
    matchedName: false,
    matchedDob: false,
  };
}

async function verifyDeath(
  donorName: string,
  donorDob: string,
  identifiers?: Record<string, string>
): Promise<{
  deceased: boolean;
  confidence: number;
  sources: string[];
  matchedName: string | null;
  matchedDob: string | null;
}> {
  const trustedSources = [
    "SSDI", // Social Security Death Index
    "STATE_VITAL_RECORDS",
    "OBITUARY_INDEX",
    "GOVERNMENT_REGISTRY",
  ];

  const results: SourceResult[] = trustedSources.map((source) =>
    simulateSourceCheck(source, donorName, donorDob)
  );

  const confirmedSources = results.filter((r) => r.found);
  const sourcesUsed = results.map((r) => r.source);

  let confidence = 0;
  if (confirmedSources.length > 0) {
    // Average confidence across confirming sources
    confidence =
      confirmedSources.reduce((sum, r) => sum + r.confidence, 0) /
      confirmedSources.length;
  }

  const deceased =
    confirmedSources.length >= REQUIRED_SOURCES && confidence >= MIN_CONFIDENCE;

  const nameMatched = confirmedSources.some((r) => r.matchedName);
  const dobMatched = confirmedSources.some((r) => r.matchedDob);

  return {
    deceased,
    confidence,
    sources: sourcesUsed,
    matchedName: nameMatched ? donorName : null,
    matchedDob: dobMatched ? donorDob : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // In production, this should be called by the claim-api or an internal scheduler,
    // not directly by the frontend. Adding basic auth check.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: VerificationRequest = await req.json();
    const { claimId, donorName, donorDob, donorIdentifiers } = body;

    if (!claimId || !donorName || !donorDob) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: claimId, donorName, donorDob" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run verification
    const result = await verifyDeath(donorName, donorDob, donorIdentifiers);

    // Persist result
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert oracle result
    await supabase.from("oracle_results").insert({
      claim_id: claimId,
      deceased: result.deceased,
      confidence: result.confidence,
      sources: result.sources,
      matched_name: result.matchedName,
      matched_dob: result.matchedDob,
    });

    // Update claim
    const newStatus =
      result.deceased && result.confidence >= MIN_CONFIDENCE
        ? "VERIFIED"
        : "DENIED";

    await supabase
      .from("claims")
      .update({
        status: newStatus,
        oracle_vote: result.deceased && result.confidence >= MIN_CONFIDENCE,
        oracle_confidence: result.confidence,
      })
      .eq("id", claimId);

    return new Response(
      JSON.stringify({
        claimId,
        ...result,
        status: newStatus,
        threshold: MIN_CONFIDENCE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Oracle verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
