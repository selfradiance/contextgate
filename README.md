# ContextGate

ContextGate is a tiny local deterministic TypeScript CLI proof for parent-agent context admission.

In v0.1, it takes a subagent report, checks each claim against explicit evidence fixtures, and writes a parent-context packet that includes only admitted claims. Unsupported subagent claims are blocked before they enter parent context. If requested, they are written to a separate quarantine artifact.

In v0.2, it adds one narrow Compression Audit seam: a compressed summary is admitted only when every required constraint id from the original context appears in `preserved_constraint_ids`.

## What It Proves

ContextGate proves narrow deterministic admission checks.

v0.1 proves:

> A harness can require explicit evidence linkage before a subagent claim is admitted into parent context.

In v0.1.0, a claim is admitted only when:

- it has at least one `evidence_id`
- every referenced evidence source exists
- at least one referenced source explicitly lists the claim id in `supports_claim_ids`

In v0.2.0, a compressed summary is admitted only when every required constraint id survived compression by appearing exactly in `preserved_constraint_ids`.

## What It Does Not Prove

ContextGate is not a full agent harness. It is not a truth engine. It does not know whether a sentence is true.

It does not call LLMs, verify natural language meaning, use a database, run a server, integrate MCP, or connect to any agent framework.

## Harness-Governance Proof

This is a before-action harness-governance proof because it focuses on the rules around what an agent system is allowed to place into shared context.

The gate runs before parent-context admission. It gives the harness a deterministic checkpoint between subagent output and parent-agent context.

## Build Rule

Every harness-governance repo should prove one narrow seam: context admission, tool admission, memory admission, compression audit, subagent boundary, credential boundary, or hook enforcement.

ContextGate v0.2 proves only two narrow seams: v0.1 context admission and v0.2 compression audit. It should not grow into a broad AgentHarness framework.

## v0.2 Compression Audit

Compression Audit proves this narrow claim:

> A harness can deterministically check whether required constraints survived compression before admitting the compressed summary into parent context.

The original context fixture defines required constraints. The compressed summary fixture includes `summary` and `preserved_constraint_ids`.

The deterministic rule is intentionally simple:

- ALLOW when every required constraint id appears in `preserved_constraint_ids`
- DENY when any required constraint id is missing
- on DENY, the admitted compressed context output is not written
- on DENY, a rejected audit artifact is written when `--rejected-out` is provided

Run the valid demo:

```bash
npm run audit-compression -- --original examples/original-context.json --summary examples/compressed-summary-valid.json --out .contextgate/compressed-context.json
```

Expected valid behavior:

- terminal output shows `Decision: ALLOW`
- `.contextgate/compressed-context.json` is written
- terminal output lists no missing constraint ids

Run the missing-constraint demo:

```bash
npm run audit-compression -- --original examples/original-context.json --summary examples/compressed-summary-missing-constraint.json --out .contextgate/compressed-context.json --rejected-out .contextgate/compression-rejected.json
```

Expected missing-constraint behavior:

- terminal output shows `Decision: DENY`
- `preserve_budget_limit` appears in the missing constraint ids
- `.contextgate/compression-rejected.json` is written
- `.contextgate/compressed-context.json` is not written for the denied run

ContextGate v0.2 does not prove that a compressed summary is semantically complete or true. It only proves that explicitly required constraint ids survived compression before the compressed summary is admitted.

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
npm run audit-compression -- --original examples/original-context.json --summary examples/compressed-summary-valid.json --out .contextgate/compressed-context.json
npm run audit-compression -- --original examples/original-context.json --summary examples/compressed-summary-missing-constraint.json --out .contextgate/compressed-context.json --rejected-out .contextgate/compression-rejected.json
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

ContextGate only checks explicit structural evidence linkage and explicit constraint-id preservation. A source can claim support incorrectly, and ContextGate will not know.

It does not compare claim text to source text. It does not detect contradiction, omission, ambiguity, or weak evidence. It only enforces that unsupported subagent claims should not enter parent context unless an explicit evidence fixture says they are supported.

For compression audit, it does not compare the compressed summary text to the original context text. It does not detect whether a preserved id was honestly represented in natural language. It only checks exact required constraint ids.
