import "server-only";
import { z } from "zod";

/**
 * Server-only env validation. Parsing runs at module load, so any server
 * file that imports this gets the guarantee that required vars exist.
 *
 * Client components must NOT import from here — use `@/lib/env` for the
 * NEXT_PUBLIC_* subset instead.
 */
const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // AI
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  QWEN_API_KEY: z.string().min(1).optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = serverSchema.parse(process.env);
export type Env = z.infer<typeof serverSchema>;
