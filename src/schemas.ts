import { z } from "zod";

export const claimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  evidence_ids: z.array(z.string().min(1)),
});

export const subagentReportSchema = z.object({
  task: z.string().min(1),
  subagent_id: z.string().min(1),
  claims: z.array(claimSchema),
});

export const evidenceSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  supports_claim_ids: z.array(z.string().min(1)),
});

export const evidenceFixtureSchema = z.object({
  sources: z.array(evidenceSourceSchema),
});

export const requiredConstraintSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const originalContextSchema = z.object({
  context_id: z.string().min(1),
  required_constraints: z.array(requiredConstraintSchema).min(1),
});

export const compressedSummarySchema = z.object({
  summary: z.string().min(1),
  preserved_constraint_ids: z.array(z.string().min(1)),
});

export type Claim = z.infer<typeof claimSchema>;
export type SubagentReport = z.infer<typeof subagentReportSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceFixture = z.infer<typeof evidenceFixtureSchema>;
export type RequiredConstraint = z.infer<typeof requiredConstraintSchema>;
export type OriginalContext = z.infer<typeof originalContextSchema>;
export type CompressedSummary = z.infer<typeof compressedSummarySchema>;
