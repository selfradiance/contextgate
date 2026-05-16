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

export type Claim = z.infer<typeof claimSchema>;
export type SubagentReport = z.infer<typeof subagentReportSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceFixture = z.infer<typeof evidenceFixtureSchema>;
