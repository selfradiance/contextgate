import { describe, expect, it } from "vitest";
import { buildParentContextPacket, gateReport } from "../src/gate.js";
import type { EvidenceFixture, SubagentReport } from "../src/schemas.js";

const evidence: EvidenceFixture = {
  sources: [
    {
      id: "source-1",
      title: "Refund Policy",
      text: "Customers may request a refund within 30 days of purchase.",
      supports_claim_ids: ["claim-1"],
    },
    {
      id: "source-2",
      title: "VIP Policy",
      text: "VIP customers receive priority support.",
      supports_claim_ids: [],
    },
  ],
};

describe("gateReport", () => {
  it("admits claim with valid explicit supporting source", () => {
    const report = makeReport([
      {
        id: "claim-1",
        text: "The refund policy allows refunds within 30 days.",
        evidence_ids: ["source-1"],
      },
    ]);

    const packet = gateReport(report, evidence);

    expect(packet.admitted_claims).toHaveLength(1);
    expect(packet.admitted_claims[0]?.id).toBe("claim-1");
    expect(packet.quarantined_claims).toHaveLength(0);
  });

  it("quarantines claim with no evidence_ids", () => {
    const report = makeReport([
      {
        id: "claim-1",
        text: "The refund policy allows refunds within 30 days.",
        evidence_ids: [],
      },
    ]);

    const packet = gateReport(report, evidence);

    expect(packet.quarantined_claims[0]?.reason).toBe("NO_EVIDENCE_IDS");
  });

  it("quarantines claim with missing evidence source", () => {
    const report = makeReport([
      {
        id: "claim-1",
        text: "The refund policy allows refunds within 30 days.",
        evidence_ids: ["source-missing"],
      },
    ]);

    const packet = gateReport(report, evidence);

    expect(packet.quarantined_claims[0]?.reason).toBe("MISSING_EVIDENCE");
  });

  it("quarantines claim when source exists but does not support claim id", () => {
    const report = makeReport([
      {
        id: "claim-2",
        text: "VIP customers get refunds after 90 days.",
        evidence_ids: ["source-2"],
      },
    ]);

    const packet = gateReport(report, evidence);

    expect(packet.quarantined_claims[0]?.reason).toBe("NO_SUPPORTING_SOURCE");
  });

  it("returns allow when all claims admitted", () => {
    const packet = gateReport(
      makeReport([
        {
          id: "claim-1",
          text: "The refund policy allows refunds within 30 days.",
          evidence_ids: ["source-1"],
        },
      ]),
      evidence,
    );

    expect(packet.decision).toBe("allow");
  });

  it("returns partial when mixed", () => {
    const packet = gateReport(
      makeReport([
        {
          id: "claim-1",
          text: "The refund policy allows refunds within 30 days.",
          evidence_ids: ["source-1"],
        },
        {
          id: "claim-2",
          text: "VIP customers get refunds after 90 days.",
          evidence_ids: ["source-2"],
        },
      ]),
      evidence,
    );

    expect(packet.decision).toBe("partial");
  });

  it("returns deny when zero admitted", () => {
    const packet = gateReport(
      makeReport([
        {
          id: "claim-2",
          text: "VIP customers get refunds after 90 days.",
          evidence_ids: ["source-2"],
        },
      ]),
      evidence,
    );

    expect(packet.decision).toBe("deny");
  });

  it("keeps unsupported claim text out of the parent context packet", () => {
    const result = gateReport(
      makeReport([
        {
          id: "claim-1",
          text: "The refund policy allows refunds within 30 days.",
          evidence_ids: ["source-1"],
        },
        {
          id: "claim-2",
          text: "VIP customers get refunds after 90 days.",
          evidence_ids: ["source-2"],
        },
      ]),
      evidence,
    );

    const parentContextPacket = buildParentContextPacket(result);
    const serializedPacket = JSON.stringify(parentContextPacket);

    expect(parentContextPacket).not.toHaveProperty("quarantined_claims");
    expect(serializedPacket).not.toContain(
      "VIP customers get refunds after 90 days.",
    );
  });
});

function makeReport(claims: SubagentReport["claims"]): SubagentReport {
  return {
    task: "research_summary",
    subagent_id: "search-agent-1",
    claims,
  };
}
