/**
 * Loads the generated backend client only when its production configuration is
 * available. This prevents an optional backend integration from crashing the
 * entire React tree before the public landing page can mount.
 */

// Fallback values so critical flows (checkout) keep working even if the build
// environment did not inject the Vite variables.
const FALLBACK_URL = "https://iczppbrhreznpmxkwfrh.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljenBwYnJocmV6bnBteGt3ZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzc3NzEsImV4cCI6MjA4ODYxMzc3MX0.gtEqx6oRoGeIpMMEK2ee9iwryp9rdp9R007I94bOWE8";

export const BACKEND_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const BACKEND_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export async function getBackendClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn("[Backend] Configuration is unavailable in this deployment.");
    return null;
  }

  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}

/**
 * Calls an edge function directly over HTTP. Works even when the generated
 * client cannot be initialised (missing build-time env vars).
 */
export async function callFunction<T = any>(
  name: string,
  body?: unknown,
  accessToken?: string | null
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BACKEND_KEY,
      Authorization: `Bearer ${accessToken || BACKEND_KEY}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(json?.error || `Request to ${name} failed (${res.status})`);
  }
  return json as T;
}
