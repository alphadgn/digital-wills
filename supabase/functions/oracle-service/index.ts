import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
} from "npm:viem@2.21.55";
import { privateKeyToAccount } from "npm:viem@2.21.55/accounts";
import { aggregateDeathRecords, MIN_CONFIDENCE } from "../_shared/deathRecords.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Oracle service.
 *
 * Pulls death-record evidence for a pending claim, records the verdict, and —
 * when the evidence clears the confidence threshold — reports it on-chain to
 * OracleGateway as an EIP-712 signed report so the claim can finalise instead
 * of sitting in "pending" forever.
 */

const GATEWAY_ABI = [
  {
    name: "createRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "submitSignedReport",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256" },
      { name: "deceased", type: "bool" },
      { name: "confidence", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "reporter", type: "address" }],
  },
  {
    name: "latestRequest",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "requests",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "vault", type: "address" },
      { name: "confirmations", type: "uint256" },
      { name: "denials", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "result", type: "bool" },
      { name: "aggregateConfidence", type: "uint256" },
      { name: "reportCount", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "finalizedAt", type: "uint256" },
    ],
  },
] as const;

const RPC_URL = Deno.env.get("ORACLE_RPC_URL") || "";
const CHAIN_ID = Number(Deno.env.get("ORACLE_CHAIN_ID") || "4663");
const GATEWAY_ADDRESS = (Deno.env.get("ORACLE_GATEWAY_ADDRESS") || "") as Address;
const SIGNER_KEY = Deno.env.get("ORACLE_SIGNER_PRIVATE_KEY") || "";
const INTERNAL_SECRET = Deno.env.get("ORACLE_INTERNAL_SECRET") || "";

function chain() {
  return defineChain({
    id: CHAIN_ID,
    name: `chain-${CHAIN_ID}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  });
}

/** Records the verdict on OracleGateway. Returns the transaction hash. */
async function reportOnChain(
  vaultAddress: Address,
  deceased: boolean,
  confidenceBps: bigint,
): Promise<string> {
  if (!RPC_URL || !GATEWAY_ADDRESS || !SIGNER_KEY) {
    throw new Error(
      "Oracle chain reporting is not configured (ORACLE_RPC_URL, ORACLE_GATEWAY_ADDRESS, ORACLE_SIGNER_PRIVATE_KEY)",
    );
  }

  const account = privateKeyToAccount(
    (SIGNER_KEY.startsWith("0x") ? SIGNER_KEY : `0x${SIGNER_KEY}`) as `0x${string}`,
  );
  const c = chain();
  const publicClient = createPublicClient({ chain: c, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: c, transport: http(RPC_URL) });

  // Reuse the open request for this vault, or open a new one.
  let requestId = (await publicClient.readContract({
    address: GATEWAY_ADDRESS,
    abi: GATEWAY_ABI,
    functionName: "latestRequest",
    args: [vaultAddress],
  })) as bigint;

  let needsNew = requestId === 0n;
  if (!needsNew) {
    const req = (await publicClient.readContract({
      address: GATEWAY_ADDRESS,
      abi: GATEWAY_ABI,
      functionName: "requests",
      args: [requestId],
    })) as unknown as any[];
    needsNew = Boolean(req[3]); // finalized
  }

  if (needsNew) {
    const hash = await walletClient.writeContract({
      address: GATEWAY_ADDRESS,
      abi: GATEWAY_ABI,
      functionName: "createRequest",
      args: [vaultAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    requestId = (await publicClient.readContract({
      address: GATEWAY_ADDRESS,
      abi: GATEWAY_ABI,
      functionName: "latestRequest",
      args: [vaultAddress],
    })) as bigint;
  }

  // Sign the decision so authorship is cryptographically attributable.
  const signature = await account.signTypedData({
    domain: {
      name: "DigitalWillsOracle",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: GATEWAY_ADDRESS,
    },
    types: {
      DeathReport: [
        { name: "requestId", type: "uint256" },
        { name: "vault", type: "address" },
        { name: "deceased", type: "bool" },
        { name: "confidence", type: "uint256" },
      ],
    },
    primaryType: "DeathReport",
    message: {
      requestId,
      vault: vaultAddress,
      deceased,
      confidence: confidenceBps,
    },
  });

  const txHash = await walletClient.writeContract({
    address: GATEWAY_ADDRESS,
    abi: GATEWAY_ABI,
    functionName: "submitSignedReport",
    args: [requestId, deceased, confidenceBps, signature],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

async function processClaim(supabase: any, claimId: string) {
  const { data: claim, error } = await supabase
    .from("claims")
    .select("*, vaults!inner(id, vault_contract_address, donor_legal_name, donor_dob)")
    .eq("id", claimId)
    .single();
  if (error || !claim) throw new Error("Claim not found");

  if (["EXECUTED", "CANCELLED", "VERIFIED", "DENIED"].includes(claim.status)) {
    return { claimId, skipped: true, reason: `Claim is already ${claim.status}` };
  }

  const vault = claim.vaults;
  if (!vault?.donor_legal_name || !vault?.donor_dob) {
    await supabase.from("claims").update({ status: "VERIFICATION_PENDING" }).eq("id", claimId);
    return {
      claimId,
      skipped: true,
      reason: "Donor legal name and date of birth are missing — complete the will form first",
    };
  }

  const verdict = await aggregateDeathRecords({
    fullName: vault.donor_legal_name,
    dob: String(vault.donor_dob).slice(0, 10),
  });

  const sources = [...verdict.sources];
  let txHash: string | null = null;
  let chainError: string | null = null;

  if (verdict.deceased && verdict.confidence >= MIN_CONFIDENCE && vault.vault_contract_address) {
    try {
      txHash = await reportOnChain(
        vault.vault_contract_address as Address,
        true,
        BigInt(Math.round(verdict.confidence * 10000)),
      );
      sources.push(`onchain:${txHash}`);
    } catch (e) {
      chainError = (e as Error).message;
      console.error("On-chain report failed:", chainError);
    }
  }

  await supabase.from("oracle_results").insert({
    claim_id: claimId,
    deceased: verdict.deceased,
    confidence: verdict.confidence,
    sources,
    matched_name: verdict.matchedName,
    matched_dob: verdict.matchedDob,
  });

  // A claim only leaves "pending" once the evidence is conclusive. If no
  // provider could answer, it stays pending for the next scheduled run.
  let status = "VERIFICATION_PENDING";
  if (verdict.deceased && verdict.confidence >= MIN_CONFIDENCE && !chainError) {
    status = "VERIFIED";
  } else if (!verdict.inconclusive && !verdict.deceased) {
    status = "DENIED";
  }

  await supabase
    .from("claims")
    .update({
      status,
      oracle_vote: verdict.deceased && verdict.confidence >= MIN_CONFIDENCE,
      oracle_confidence: verdict.confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  return {
    claimId,
    status,
    deceased: verdict.deceased,
    confidence: verdict.confidence,
    confirmingSources: verdict.confirmingSources,
    configuredSources: verdict.configuredSources,
    inconclusive: verdict.inconclusive,
    txHash,
    chainError,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal service — only the platform's own callers (claim-api, scheduler)
    // may drive verification.
    const provided = req.headers.get("x-oracle-secret") || "";
    if (!INTERNAL_SECRET || provided !== INTERNAL_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    let processed: any[] = [];

    if (body.claimId) {
      processed = [await processClaim(supabase, body.claimId)];
    } else {
      const { data: pending } = await supabase
        .from("claims")
        .select("id")
        .in("status", ["INITIATED", "VERIFICATION_PENDING"])
        .order("created_at", { ascending: true })
        .limit(25);

      for (const c of pending || []) {
        try {
          processed.push(await processClaim(supabase, c.id));
        } catch (e) {
          processed.push({ claimId: c.id, error: (e as Error).message });
        }
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("oracle-service error:", error);
    return new Response(JSON.stringify({ error: error.message || "Oracle run failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
