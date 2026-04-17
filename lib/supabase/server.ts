import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-side Supabase client with service-role key — bypasses RLS.
 * Only call from server components, route handlers, or server actions.
 * Never import from client components.
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
