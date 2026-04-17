"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";

let singleton: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (singleton) return singleton;
  singleton = createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return singleton;
}
