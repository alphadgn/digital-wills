/**
 * Loads the generated backend client only when its production configuration is
 * available. This prevents an optional backend integration from crashing the
 * entire React tree before the public landing page can mount.
 */
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