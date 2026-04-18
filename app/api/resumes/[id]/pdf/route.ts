import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { resumes } from "@/db/schema/resumes";
import { verifySession } from "@/lib/auth/dal";
import { parseResumeContent } from "@/lib/resume/schema";
import { renderResumePdf } from "@/services/pdf/render";

// Rendering fonts + PDF uses Node APIs (fs) — must run on Node runtime, not edge.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await verifySession();

  const resume = await db.query.resumes.findFirst({
    where: and(eq(resumes.id, id), eq(resumes.userId, userId)),
  });
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const content = parseResumeContent(resume.currentVersionJson);
  const pdf = await renderResumePdf(content);

  const { ascii, unicode } = buildFilename(content.basicInfo.name);
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      // ASCII fallback per RFC 6266 + UTF-8 encoded name per RFC 5987.
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(unicode)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

function buildFilename(name: string): { ascii: string; unicode: string } {
  const stem = name.trim() || "resume";
  const unicode = `${stem}-FirstCV.pdf`;
  // Any non-ASCII char (e.g. Chinese name) → browsers that don't understand
  // filename*= fall back to "resume-FirstCV.pdf".
  const ascii = /[^\x20-\x7e]/.test(stem)
    ? "resume-FirstCV.pdf"
    : unicode;
  return { ascii, unicode };
}
