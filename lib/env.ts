import { z } from "zod";

/**
 * Client-safe env. Only NEXT_PUBLIC_* vars; safe to import from client
 * components, server actions and server components alike.
 *
 * Server-only vars (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_*)
 * live in `@/lib/env.server`.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
