import "server-only";

import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { aiTasks } from "@/db/schema/aiTasks";

export const AI_QUOTAS = {
  rewrite: 30,
  checkup: 5,
  upload: 3,
} as const;

export type AiTaskKind = keyof typeof AI_QUOTAS;

export type AiUsage = {
  rewriteUsed: number;
  checkupUsed: number;
  uploadUsed: number;
};

export type AiQuotaSnapshot = AiUsage & {
  rewriteLimit: number;
  checkupLimit: number;
  uploadLimit: number;
};

const kindToColumn: Record<AiTaskKind, string> = {
  rewrite: "rewrite_block",
  checkup: "checkup",
  upload: "parse_upload",
};

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getMonthlyAiUsage(userId: string): Promise<AiUsage> {
  const rows = await db.query.aiTasks.findMany({
    where: and(
      eq(aiTasks.userId, userId),
      gte(aiTasks.createdAt, startOfMonth()),
    ),
    columns: { taskType: true, status: true },
  });

  let rewriteUsed = 0;
  let checkupUsed = 0;
  let uploadUsed = 0;
  for (const r of rows) {
    if (r.status === "failed") continue; // failed attempts don't count
    if (r.taskType === kindToColumn.rewrite) rewriteUsed += 1;
    else if (r.taskType === kindToColumn.checkup) checkupUsed += 1;
    else if (r.taskType === kindToColumn.upload) uploadUsed += 1;
  }
  return { rewriteUsed, checkupUsed, uploadUsed };
}

export async function getAiQuotaSnapshot(
  userId: string,
): Promise<AiQuotaSnapshot> {
  const usage = await getMonthlyAiUsage(userId);
  return {
    ...usage,
    rewriteLimit: AI_QUOTAS.rewrite,
    checkupLimit: AI_QUOTAS.checkup,
    uploadLimit: AI_QUOTAS.upload,
  };
}

const quotaLabel: Record<AiTaskKind, string> = {
  rewrite: "改写",
  checkup: "体检",
  upload: "PDF 解析",
};

export function checkQuota(
  usage: AiUsage,
  kind: AiTaskKind,
): { ok: true } | { ok: false; error: string } {
  const used =
    kind === "rewrite"
      ? usage.rewriteUsed
      : kind === "checkup"
        ? usage.checkupUsed
        : usage.uploadUsed;
  const limit = AI_QUOTAS[kind];
  if (used >= limit) {
    return {
      ok: false,
      error: `本月 AI ${quotaLabel[kind]}已用完（${used} / ${limit}）。下月 1 号重置。`,
    };
  }
  return { ok: true };
}
