"use server";

import { eq } from "drizzle-orm";
import { extractText } from "unpdf";
import { aiTasks } from "@/db/schema/aiTasks";
import { resumes } from "@/db/schema/resumes";
import { db } from "@/db/client";
import { verifySession } from "@/lib/auth/dal";
import { checkQuota, getMonthlyAiUsage, getUserPlan } from "@/lib/ai/quota";
import { parseResumeFromText } from "@/services/ai/parse";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadResponse =
  | { ok: true; resumeId: string }
  | { ok: false; error: string };

export async function parseResumeUpload(
  formData: FormData,
): Promise<UploadResponse> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "请选择一个文件" };
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "只支持 PDF 文件" };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "文件大于 5 MB，暂不支持" };
  }

  const { userId } = await verifySession();

  const [usage, plan] = await Promise.all([
    getMonthlyAiUsage(userId),
    getUserPlan(userId),
  ]);
  const quota = checkQuota(usage, "upload", plan);
  if (!quota.ok) {
    return { ok: false, error: quota.error };
  }

  // 1. PDF → raw text
  const buffer = new Uint8Array(await file.arrayBuffer());
  let rawText: string;
  try {
    const { text } = await extractText(buffer, { mergePages: true });
    rawText = text.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF 解析失败";
    return { ok: false, error: `PDF 读取失败：${message}` };
  }

  if (!rawText) {
    return {
      ok: false,
      error: "PDF 里没有抽出文字——可能是扫描件或图片版简历，暂不支持",
    };
  }

  // 2. AI parse — create ai_tasks row first for logging even if the AI call fails.
  const [task] = await db
    .insert(aiTasks)
    .values({
      userId,
      taskType: "parse_upload",
      provider: "deepseek",
      model: "pending",
      inputJson: { fileName: file.name, fileSize: file.size },
      status: "running",
    })
    .returning({ id: aiTasks.id });

  let parsedContent;
  try {
    const run = await parseResumeFromText(rawText);
    parsedContent = run.content;

    await db
      .update(aiTasks)
      .set({
        status: "success",
        model: run.modelId,
        outputJson: run.content,
        tokensInput: run.tokensInput,
        tokensOutput: run.tokensOutput,
        updatedAt: new Date(),
      })
      .where(eq(aiTasks.id, task.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 解析失败";
    await db
      .update(aiTasks)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(aiTasks.id, task.id));
    return { ok: false, error: `AI 解析失败：${message}` };
  }

  // 3. Persist resume
  const [created] = await db
    .insert(resumes)
    .values({
      userId,
      sourceType: "upload",
      rawText,
      parsedJson: parsedContent,
      currentVersionJson: parsedContent,
    })
    .returning({ id: resumes.id });

  // Link the ai_tasks row to the new resume now that it exists.
  await db
    .update(aiTasks)
    .set({ resumeId: created.id })
    .where(eq(aiTasks.id, task.id));

  return { ok: true, resumeId: created.id };
}
