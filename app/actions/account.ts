"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/auth/dal";

const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;

export type AccountUpdateState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null;

export async function updateDisplayName(
  _prev: AccountUpdateState,
  formData: FormData,
): Promise<AccountUpdateState> {
  const { userId } = await verifySession();
  const raw = String(formData.get("displayName") ?? "").trim();
  if (raw.length > 120) {
    return { ok: false, error: "名字太长了（120 字以内）" };
  }

  await db
    .update(users)
    .set({
      displayName: raw || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true, message: "已保存" };
}

export async function updateLocale(
  _prev: AccountUpdateState,
  formData: FormData,
): Promise<AccountUpdateState> {
  const { userId } = await verifySession();
  const raw = String(formData.get("locale") ?? "");
  if (!SUPPORTED_LOCALES.includes(raw as (typeof SUPPORTED_LOCALES)[number])) {
    return { ok: false, error: "不支持的语言" };
  }

  await db
    .update(users)
    .set({ locale: raw, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { ok: true, message: "已切换" };
}
