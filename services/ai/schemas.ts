import { z } from "zod";

/**
 * Structured output schemas. We always force the model to return JSON
 * that matches one of these shapes so business code stays typed.
 */

export const rewriteBlockSchema = z.object({
  original: z.string(),
  rewritten: z.string(),
  reasons: z.array(z.string()).min(1).max(5),
  preservedFacts: z.array(z.string()).default([]),
});
export type RewriteBlock = z.infer<typeof rewriteBlockSchema>;

export const checkupIssueSchema = z.object({
  severity: z.enum(["critical", "moderate", "suggestion"]),
  dimension: z.enum([
    "structure",
    "job_match",
    "professional_tone",
    "outcome",
    "conciseness",
  ]),
  title: z.string(),
  detail: z.string(),
  section: z.string().optional(),
  suggestedRewrite: z.string().optional(),
});
export type CheckupIssue = z.infer<typeof checkupIssueSchema>;

export const checkupResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dimensionScores: z.object({
    structure: z.number().min(0).max(100),
    jobMatch: z.number().min(0).max(100),
    professionalTone: z.number().min(0).max(100),
    outcome: z.number().min(0).max(100),
    conciseness: z.number().min(0).max(100),
  }),
  summary: z.string(),
  issues: z.array(checkupIssueSchema).max(10),
});
export type CheckupResult = z.infer<typeof checkupResultSchema>;
