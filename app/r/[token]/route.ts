import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { resumes } from "@/db/schema/resumes";
import { parseResumeContent } from "@/lib/resume/schema";
import { renderResumePdf } from "@/services/pdf/render";

// Public share endpoint — no auth. Uses Node runtime for fs font loading.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resume = await db.query.resumes.findFirst({
    where: and(
      eq(resumes.shareToken, token),
      eq(resumes.shareEnabled, true),
    ),
  });
  if (!resume) {
    return NextResponse.json(
      { error: "分享链接已失效或不存在" },
      { status: 404 },
    );
  }

  const content = parseResumeContent(resume.currentVersionJson);
  const pdf = await renderResumePdf(content);

  // Inline disposition so the browser renders the PDF in-tab rather than downloading.
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      // Let the browser cache briefly; we want edits to show up fairly fast.
      "Cache-Control": "public, max-age=60",
    },
  });
}
