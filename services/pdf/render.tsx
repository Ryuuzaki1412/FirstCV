import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "./template";
import type { ResumeContent } from "@/lib/resume/schema";

export async function renderResumePdf(content: ResumeContent): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument content={content} />);
}
