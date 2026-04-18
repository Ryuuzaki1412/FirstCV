import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env.server";

/**
 * Server-side Supabase client bound to the request's cookie jar.
 * Reads and writes happen against RLS-respecting anon key.
 * Must be created per-request — never cached across requests.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — cookie writes are not allowed.
            // Token refresh is handled by proxy.ts, so this is safe to ignore.
          }
        },
      },
    },
  );
}
