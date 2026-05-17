import type { CompressedSummary, OriginalContext } from "./schemas.js";

export type CompressionAuditDecision = "allow" | "deny";

export type CompressionAuditResult = {
  decision: CompressionAuditDecision;
  context_id: string;
  summary: string;
  required_constraint_ids: string[];
  preserved_constraint_ids: string[];
  missing_constraint_ids: string[];
};

export type AdmittedCompressedContextPacket = {
  decision: "allow";
  context_id: string;
  summary: string;
  preserved_constraint_ids: string[];
  required_constraint_ids: string[];
};

export type RejectedCompressionAuditArtifact = {
  decision: "deny";
  context_id: string;
  summary: string;
  reason: "MISSING_REQUIRED_CONSTRAINTS";
  preserved_constraint_ids: string[];
  required_constraint_ids: string[];
  missing_constraint_ids: string[];
};

export function auditCompression(
  original: OriginalContext,
  compressed: CompressedSummary,
): CompressionAuditResult {
  const requiredConstraintIds = original.required_constraints.map(
    (constraint) => constraint.id,
  );
  const preservedConstraintIds = new Set(compressed.preserved_constraint_ids);
  const missingConstraintIds = requiredConstraintIds.filter(
    (id) => !preservedConstraintIds.has(id),
  );

  return {
    decision: missingConstraintIds.length === 0 ? "allow" : "deny",
    context_id: original.context_id,
    summary: compressed.summary,
    required_constraint_ids: requiredConstraintIds,
    preserved_constraint_ids: compressed.preserved_constraint_ids,
    missing_constraint_ids: missingConstraintIds,
  };
}

export function buildAdmittedCompressedContextPacket(
  result: CompressionAuditResult,
): AdmittedCompressedContextPacket {
  if (result.decision !== "allow") {
    throw new Error("Cannot admit compressed summary after DENY decision.");
  }

  return {
    decision: "allow",
    context_id: result.context_id,
    summary: result.summary,
    preserved_constraint_ids: result.preserved_constraint_ids,
    required_constraint_ids: result.required_constraint_ids,
  };
}

export function buildRejectedCompressionAuditArtifact(
  result: CompressionAuditResult,
): RejectedCompressionAuditArtifact {
  if (result.decision !== "deny") {
    throw new Error("Cannot reject compressed summary after ALLOW decision.");
  }

  return {
    decision: "deny",
    context_id: result.context_id,
    summary: result.summary,
    reason: "MISSING_REQUIRED_CONSTRAINTS",
    preserved_constraint_ids: result.preserved_constraint_ids,
    required_constraint_ids: result.required_constraint_ids,
    missing_constraint_ids: result.missing_constraint_ids,
  };
}
