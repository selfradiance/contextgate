import { describe, expect, it } from "vitest";
import {
  auditCompression,
  buildAdmittedCompressedContextPacket,
  buildRejectedCompressionAuditArtifact,
} from "../src/compression-audit.js";
import type { CompressedSummary, OriginalContext } from "../src/schemas.js";

const originalContext: OriginalContext = {
  context_id: "email-approval-budget-context",
  required_constraints: [
    {
      id: "keep_human_approval_required",
      text: "Human approval is required before action.",
    },
    {
      id: "do_not_send_email",
      text: "Do not send email from this harness.",
    },
    {
      id: "preserve_budget_limit",
      text: "The budget limit is USD 500.",
    },
  ],
};

describe("auditCompression", () => {
  it("allows a compressed summary when all required constraint ids survived", () => {
    const result = auditCompression(originalContext, makeSummary([
      "keep_human_approval_required",
      "do_not_send_email",
      "preserve_budget_limit",
    ]));

    expect(result.decision).toBe("allow");
    expect(result.missing_constraint_ids).toEqual([]);
  });

  it("denies a compressed summary when any required constraint id is missing", () => {
    const result = auditCompression(originalContext, makeSummary([
      "keep_human_approval_required",
      "do_not_send_email",
    ]));

    expect(result.decision).toBe("deny");
    expect(result.missing_constraint_ids).toEqual(["preserve_budget_limit"]);
  });

  it("builds an admitted compressed context packet only after ALLOW", () => {
    const result = auditCompression(originalContext, makeSummary([
      "keep_human_approval_required",
      "do_not_send_email",
      "preserve_budget_limit",
    ]));

    const packet = buildAdmittedCompressedContextPacket(result);

    expect(packet).toMatchObject({
      decision: "allow",
      context_id: "email-approval-budget-context",
      preserved_constraint_ids: [
        "keep_human_approval_required",
        "do_not_send_email",
        "preserve_budget_limit",
      ],
    });
  });

  it("builds a rejected artifact with missing constraint ids after DENY", () => {
    const result = auditCompression(originalContext, makeSummary([
      "keep_human_approval_required",
      "do_not_send_email",
    ]));

    const artifact = buildRejectedCompressionAuditArtifact(result);

    expect(artifact).toMatchObject({
      decision: "deny",
      reason: "MISSING_REQUIRED_CONSTRAINTS",
      missing_constraint_ids: ["preserve_budget_limit"],
    });
  });
});

function makeSummary(
  preservedConstraintIds: string[],
): CompressedSummary {
  return {
    summary: "The compressed summary keeps explicit constraint ids.",
    preserved_constraint_ids: preservedConstraintIds,
  };
}
