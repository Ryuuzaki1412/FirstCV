"use server";

import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { resumes } from "@/db/schema/resumes";
import { verifySession } from "@/lib/auth/dal";
import {
  emptyResumeContent,
  resumeContentSchema,
  type ResumeContent,
} from "@/lib/resume/schema";

export async function listResumes() {
  const { userId } = await verifySession();
  return db.query.resumes.findMany({
    where: eq(resumes.userId, userId),
    orderBy: [desc(resumes.updatedAt)],
  });
}

export async function getResume(id: string) {
  const { userId } = await verifySession();
  return db.query.resumes.findFirst({
    where: and(eq(resumes.id, id), eq(resumes.userId, userId)),
  });
}

export async function createResume() {
  const { userId } = await verifySession();
  const [created] = await db
    .insert(resumes)
    .values({
      userId,
      sourceType: "create",
      currentVersionJson: emptyResumeContent(),
    })
    .returning({ id: resumes.id });

  revalidatePath("/dashboard");
  redirect(`/resume/${created.id}`);
}

export async function updateResume(
  id: string,
  content: ResumeContent,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await verifySession();

  const parsed = resumeContentSchema.safeParse(content);
  if (!parsed.success) {
    return { ok: false, error: "简历内容格式有误" };
  }

  const result = await db
    .update(resumes)
    .set({ currentVersionJson: parsed.data, updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning({ id: resumes.id });

  if (!result[0]) {
    return { ok: false, error: "简历不存在或无权编辑" };
  }

  revalidatePath(`/resume/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteResume(id: string) {
  const { userId } = await verifySession();
  await db
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
