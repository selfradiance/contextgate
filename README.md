# ContextGate

ContextGate is a tiny local deterministic TypeScript CLI proof for parent-agent context admission.

It takes a subagent report, checks each claim against explicit evidence fixtures, and writes a parent-context packet that includes only admitted claims. Unsupported subagent claims are blocked before they enter parent context. If requested, they are written to a separate quarantine artifact.

## What It Proves

ContextGate proves one narrow idea:

> A harness can require explicit evidence linkage before a subagent claim is admitted into parent context.

In v0.1.0, a claim is admitted only when:

- it has at least one `evidence_id`
- every referenced evidence source exists
- at least one referenced source explicitly lists the claim id in `supports_claim_ids`

## What It Does Not Prove

ContextGate is not a full agent harness. It is not a truth engine. It does not know whether a sentence is true.

It does not call LLMs, verify natural language meaning, use a database, run a server, integrate MCP, or connect to any agent framework.

## Harness-Governance Proof

This is a before-action harness-governance proof because it focuses on the rules around what an agent system is allowed to place into shared context.

The gate runs before parent-context admission. It gives the harness a deterministic checkpoint between subagent output and parent-agent context.

## Build Rule

Every harness-governance repo should prove one narrow seam: context admission, tool admission, memory admission, compression audit, subagent boundary, credential boundary, or hook enforcement.

ContextGate proves only context admission. It should not grow into a broad AgentHarness framework.

## Relationship To AgentGate

AgentGate handles after-action accountability.

ContextGate handles before-context admission.

They are related governance ideas, but this project does not integrate with AgentGate.

## Quickstart

```bash
npm install
npm test
npm run typecheck
npm run build
npm run gate -- --report examples/subagent-report.json --evidence examples/evidence.json --out .contextgate/context-packet.json --quarantine-out .contextgate/quarantine.json
```

## Example Terminal Output

```text
CONTEXTGATE RESULT

Task: research_summary
Subagent: search-agent-1

Admitted claims:
- claim-1: The refund policy allows refunds within 30 days.

Quarantined claims:
- claim-2: VIP customers get refunds after 90 days.
  reason: NO_SUPPORTING_SOURCE

Parent context packet written to:
.contextgate/context-packet.json
Quarantine artifact written to:
.contextgate/quarantine.json
```

## Honest Limitations

ContextGate only checks explicit structural evidence linkage. A source can claim support incorrectly, and ContextGate will not know.

It does not compare claim text to source text. It does not detect contradiction, omission, ambiguity, or weak evidence. It only enforces that unsupported subagent claims should not enter parent context unless an explicit evidence fixture says they are supported.
