import { notFound } from "next/navigation";
import Link from "next/link";
import { getResume } from "@/app/actions/resumes";
import { parseResumeContent } from "@/lib/resume/schema";
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

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-olive-gray hover:text-near-black transition mb-6"
      >
        <span>←</span>
        <span>返回</span>
      </Link>
      <ResumeEditor resumeId={resume.id} initialContent={content} />
    </div>
  );
}
