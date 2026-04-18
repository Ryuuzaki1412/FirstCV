"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiTasks } from "@/db/schema/aiTasks";
import { resumes } from "@/db/schema/resumes";
import { verifySession } from "@/lib/auth/dal";
import { parseResumeContent } from "@/lib/resume/schema";
import { checkQuota, getMonthlyAiUsage } from "@/lib/ai/quota";
import { rewriteBlock } from "@/services/ai/rewrite";
import { runCheckup } from "@/services/ai/checkup";
import type {
  CheckupResult,
  RewriteBlock,
} from "@/services/ai/schemas";

export type RewriteResponse =
  | { ok: true; result: RewriteBlock; taskId: string }
  | { ok: false; error: string };

export async function rewriteHighlight(input: {
  resumeId: string;
  text: string;
  context?: Record<string, string>;
}): Promise<RewriteResponse> {
  if (!input.text.trim()) {
    return { ok: false, error: "原文为空，无法改写" };
  }

  const { userId } = await verifySession();

  const resume = await db.query.resumes.findFirst({
    where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)),
  });
  if (!resume) {
    return { ok: false, error: "简历不存在或无权访问" };
  }

  const usage = await getMonthlyAiUsage(userId);
  const quota = checkQuota(usage, "rewrite");
  if (!quota.ok) {
    return { ok: false, error: quota.error };
  }

  const content = parseResumeContent(resume.currentVersionJson);
  const jobCategory = content.targetRole || "通用";

  const [task] = await db
    .insert(aiTasks)
    .values({
      userId,
      resumeId: input.resumeId,
      taskType: "rewrite_block",
      provider: "deepseek",
      model: "pending",
      inputJson: {
        jobCategory,
        original: input.text,
        context: input.context ?? {},
      },
      status: "running",
    })
    .returning({ id: aiTasks.id });

  try {
    const result = await rewriteBlock({
      jobCategory,
      original: input.text,
      context: input.context,
    });

    await db
      .update(aiTasks)
      .set({
        status: "success",
        model: result.modelId,
        outputJson: result.block,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        updatedAt: new Date(),
      })
      .where(eq(aiTasks.id, task.id));

    return { ok: true, result: result.block, taskId: task.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 调用失败";
    await db
      .update(aiTasks)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(aiTasks.id, task.id));

    return { ok: false, error: message };
  }
}

export type CheckupResponse =
  | { ok: true; result: CheckupResult; taskId: string }
  | { ok: false; error: string };

export async function runResumeCheckup(
  resumeId: string,
): Promise<CheckupResponse> {
  const { userId } = await verifySession();

  const resume = await db.query.resumes.findFirst({
    where: and(eq(resumes.id, resumeId), eq(resumes.userId, userId)),
  });
  if (!resume) {
    return { ok: false, error: "简历不存在或无权访问" };
  }

  const usage = await getMonthlyAiUsage(userId);
  const quota = checkQuota(usage, "checkup");
  if (!quota.ok) {
    return { ok: false, error: quota.error };
  }

  const content = parseResumeContent(resume.currentVersionJson);
  const jobCategory = content.targetRole || "通用";

  const [task] = await db
    .insert(aiTasks)
    .values({
      userId,
      resumeId,
      taskType: "checkup",
      provider: "deepseek",
      model: "pending",
      inputJson: { jobCategory, resumeContent: content },
      status: "running",
    })
    .returning({ id: aiTasks.id });

  try {
    const run = await runCheckup({ jobCategory, resumeJson: content });

    await db
      .update(aiTasks)
      .set({
        status: "success",
        model: run.modelId,
        outputJson: run.result,
        tokensInput: run.tokensInput,
        tokensOutput: run.tokensOutput,
        updatedAt: new Date(),
      })
      .where(eq(aiTasks.id, task.id));

    return { ok: true, result: run.result, taskId: task.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 调用失败";
    await db
      .update(aiTasks)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(aiTasks.id, task.id));
    return { ok: false, error: message };
  }
}
