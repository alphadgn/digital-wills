/**
 * Death record providers.
 *
 * Each provider is a real HTTP lookup against a death-record data source,
 * configured through secrets. Providers that are not configured are reported as
 * `unavailable` and never contribute a confirmation — the oracle can only reach
 * a positive verdict from sources that actually answered.
 *
 * Expected provider response shape (JSON), which every mainstream DMF/SSDI and
 * obituary aggregation vendor can be mapped onto:
 *   { "found": boolean, "confidence": 0..1, "matchedName"?: string, "matchedDob"?: string }
 * A `records: []` array is also accepted, in which case a non-empty array with
 * a matching name + date of birth counts as a confirmation.
 */

export interface SourceResult {
  source: string;
  configured: boolean;
  found: boolean;
  confidence: number;
  matchedName: string | null;
  matchedDob: string | null;
  error?: string;
}

export interface DeathQuery {
  fullName: string;
  dob: string; // YYYY-MM-DD
  identifiers?: Record<string, string>;
}

interface ProviderConfig {
  source: string;
  urlEnv: string;
  keyEnv: string;
}

const PROVIDERS: ProviderConfig[] = [
  { source: "SSDI_DMF", urlEnv: "SSDI_API_URL", keyEnv: "SSDI_API_KEY" },
  { source: "STATE_VITAL_RECORDS", urlEnv: "VITAL_RECORDS_API_URL", keyEnv: "VITAL_RECORDS_API_KEY" },
  { source: "OBITUARY_INDEX", urlEnv: "OBITUARY_API_URL", keyEnv: "OBITUARY_API_KEY" },
];

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

function interpret(source: string, body: any, query: DeathQuery): SourceResult {
  // Shape A: explicit verdict
  if (typeof body?.found === "boolean") {
    const confidence = typeof body.confidence === "number" ? body.confidence : body.found ? 1 : 0;
    return {
      source,
      configured: true,
      found: body.found,
      confidence: Math.max(0, Math.min(1, confidence)),
      matchedName: body.matchedName ?? (body.found ? query.fullName : null),
      matchedDob: body.matchedDob ?? (body.found ? query.dob : null),
    };
  }

  // Shape B: record list — require both name and DOB to line up.
  const records: any[] = Array.isArray(body) ? body : body?.records || body?.results || [];
  const match = records.find((r) => {
    const name = normalise(String(r.name ?? `${r.firstName ?? ""} ${r.lastName ?? ""}`));
    const dob = String(r.dob ?? r.dateOfBirth ?? r.birthDate ?? "").slice(0, 10);
    return name === normalise(query.fullName) && dob === query.dob;
  });

  if (!match) {
    return { source, configured: true, found: false, confidence: 0, matchedName: null, matchedDob: null };
  }

  const confidence = typeof match.confidence === "number" ? match.confidence : 1;
  return {
    source,
    configured: true,
    found: true,
    confidence: Math.max(0, Math.min(1, confidence)),
    matchedName: query.fullName,
    matchedDob: query.dob,
  };
}

async function queryProvider(cfg: ProviderConfig, query: DeathQuery): Promise<SourceResult> {
  const url = Deno.env.get(cfg.urlEnv);
  const key = Deno.env.get(cfg.keyEnv);

  if (!url) {
    return {
      source: cfg.source,
      configured: false,
      found: false,
      confidence: 0,
      matchedName: null,
      matchedDob: null,
      error: `${cfg.urlEnv} is not configured`,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}`, "x-api-key": key } : {}),
      },
      body: JSON.stringify({
        fullName: query.fullName,
        firstName: query.fullName.split(" ")[0],
        lastName: query.fullName.split(" ").slice(1).join(" "),
        dob: query.dob,
        ...query.identifiers,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        source: cfg.source,
        configured: true,
        found: false,
        confidence: 0,
        matchedName: null,
        matchedDob: null,
        error: `HTTP ${res.status}`,
      };
    }

    return interpret(cfg.source, await res.json(), query);
  } catch (e) {
    return {
      source: cfg.source,
      configured: true,
      found: false,
      confidence: 0,
      matchedName: null,
      matchedDob: null,
      error: (e as Error).message,
    };
  }
}

export interface AggregateVerdict {
  deceased: boolean;
  confidence: number;
  sources: string[];
  configuredSources: string[];
  confirmingSources: string[];
  matchedName: string | null;
  matchedDob: string | null;
  results: SourceResult[];
  /** True when too few providers are configured to reach any verdict at all. */
  inconclusive: boolean;
}

export const MIN_CONFIDENCE = 0.99;
export const REQUIRED_SOURCES = 2;

export async function aggregateDeathRecords(query: DeathQuery): Promise<AggregateVerdict> {
  const results = await Promise.all(PROVIDERS.map((p) => queryProvider(p, query)));

  const configured = results.filter((r) => r.configured);
  const confirming = results.filter((r) => r.found);

  const confidence = confirming.length
    ? confirming.reduce((sum, r) => sum + r.confidence, 0) / confirming.length
    : 0;

  const deceased = confirming.length >= REQUIRED_SOURCES && confidence >= MIN_CONFIDENCE;

  return {
    deceased,
    confidence,
    sources: results.map((r) => r.source),
    configuredSources: configured.map((r) => r.source),
    confirmingSources: confirming.map((r) => r.source),
    matchedName: confirming.find((r) => r.matchedName)?.matchedName ?? null,
    matchedDob: confirming.find((r) => r.matchedDob)?.matchedDob ?? null,
    results,
    inconclusive: configured.length < REQUIRED_SOURCES,
  };
}
