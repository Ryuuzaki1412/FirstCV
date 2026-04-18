import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiTasks } from "@/db/schema/aiTasks";
import { getResume } from "@/app/actions/resumes";
import { verifySession } from "@/lib/auth/dal";
import { getAiQuotaSnapshot } from "@/lib/ai/quota";
import { parseResumeContent } from "@/lib/resume/schema";
import { checkupResultSchema } from "@/services/ai/schemas";
import { ResumeEditor } from "./ResumeEditor";

export default async function ResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resume = await getResume(id);
  if (!resume) notFound();

  const content = parseResumeContent(resume.currentVersionJson);

  const { userId } = await verifySession();
  const quotaSnapshot = await getAiQuotaSnapshot(userId);

  const latest = await db.query.aiTasks.findFirst({
    where: and(
      eq(aiTasks.resumeId, resume.id),
      eq(aiTasks.taskType, "checkup"),
      eq(aiTasks.status, "success"),
    ),
    orderBy: [desc(aiTasks.createdAt)],
  });

  const parsed = latest
    ? checkupResultSchema.safeParse(latest.outputJson)
    : null;
  const initialCheckup =
    parsed?.success && latest
      ? { data: parsed.data, at: latest.createdAt.toISOString() }
      : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-olive-gray hover:text-near-black transition mb-6"
      >
        <span>←</span>
        <span>返回</span>
      </Link>
      <ResumeEditor
        resumeId={resume.id}
        initialContent={content}
        initialCheckup={initialCheckup}
        initialQuota={quotaSnapshot}
        initialShare={{
          enabled: resume.shareEnabled,
          token: resume.shareToken,
        }}
      />
    </div>
  );
}
