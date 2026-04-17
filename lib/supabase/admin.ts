import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client — bypasses RLS.
 * Use only for server-side admin tasks (webhook handlers, cron jobs, backfills).
 * Never expose to user-facing request paths.
 */
export function supabaseAdmin() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
