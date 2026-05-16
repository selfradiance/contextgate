import type { Claim, EvidenceFixture, SubagentReport } from "./schemas.js";

export type Decision = "allow" | "partial" | "deny";
export type QuarantineReason =
  | "NO_EVIDENCE_IDS"
  | "MISSING_EVIDENCE"
  | "NO_SUPPORTING_SOURCE";

export type AdmittedClaim = Claim;

export type QuarantinedClaim = Claim & {
  reason: QuarantineReason;
};

export type ContextPacket = {
  decision: Decision;
  task: string;
  subagent_id: string;
  admitted_claims: AdmittedClaim[];
  quarantined_claims: QuarantinedClaim[];
  summary: {
    total_claims: number;
    admitted: number;
    quarantined: number;
  };
};

export function gateReport(
  report: SubagentReport,
  evidence: EvidenceFixture,
): ContextPacket {
  const sourceById = new Map(
    evidence.sources.map((source) => [source.id, source]),
  );
  const admitted_claims: AdmittedClaim[] = [];
  const quarantined_claims: QuarantinedClaim[] = [];

  for (const claim of report.claims) {
    if (claim.evidence_ids.length === 0) {
      quarantined_claims.push({ ...claim, reason: "NO_EVIDENCE_IDS" });
      continue;
    }

    const referencedSources = claim.evidence_ids.map((id) => sourceById.get(id));
    if (referencedSources.some((source) => source === undefined)) {
      quarantined_claims.push({ ...claim, reason: "MISSING_EVIDENCE" });
      continue;
    }

    const hasSupportingSource = referencedSources.some((source) =>
      source?.supports_claim_ids.includes(claim.id),
    );

    if (!hasSupportingSource) {
      quarantined_claims.push({ ...claim, reason: "NO_SUPPORTING_SOURCE" });
      continue;
    }

    admitted_claims.push(claim);
  }

  const totalClaims = report.claims.length;
  const admittedCount = admitted_claims.length;
  const quarantinedCount = quarantined_claims.length;
  const decision = getDecision(admittedCount, quarantinedCount);

  return {
    decision,
    task: report.task,
    subagent_id: report.subagent_id,
    admitted_claims,
    quarantined_claims,
    summary: {
      total_claims: totalClaims,
      admitted: admittedCount,
      quarantined: quarantinedCount,
    },
  };
}

function getDecision(admittedCount: number, quarantinedCount: number): Decision {
  if (admittedCount === 0) {
    return "deny";
  }

  if (quarantinedCount === 0) {
    return "allow";
  }

  return "partial";
}
