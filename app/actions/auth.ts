"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { clientEnv } from "@/lib/env";

const emailSchema = z.email({ error: "请输入有效的邮箱地址" });

export type SignInState = {
  error?: string;
  sent?: boolean;
  email?: string;
} | null;

export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/dashboard");

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "邮箱格式有误", email };
  }

  const supabase = await supabaseServer();
  const redirectTo = new URL("/auth/callback", clientEnv.NEXT_PUBLIC_SITE_URL);
  redirectTo.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: redirectTo.toString() },
  });

  if (error) {
    return { error: error.message, email };
  }

  return { sent: true, email: parsed.data };
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
