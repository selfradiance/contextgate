# ContextGate

ContextGate is a tiny local TypeScript CLI for deterministic context-admission checks. It currently contains two narrow proofs: unsupported claim admission and compression constraint survival.

It does not call LLMs, use a network, run a server, integrate with MCP, or integrate with AgentGate.

## Current Proofs

1. **v0.1.0 — Unsupported Claim Admission Gate**

Unsupported subagent claims should not enter the parent context packet.

The CLI takes a subagent report, checks each claim against explicit evidence fixtures, and writes a parent-context packet that includes only admitted claims. Unsupported claims are blocked before they enter parent context. If requested, blocked claims are written to a separate quarantine artifact.

2. **v0.2.0 — Compression Audit**

A compressed context summary should not be admitted if required constraints from the original context were dropped.

The CLI takes an original context fixture and a compressed summary fixture. The compressed summary is admitted only when every required constraint id from the original context appears in `preserved_constraint_ids`.

## Deterministic Rules

In v0.1.0, a claim is admitted only when:

- it has at least one `evidence_id`
- every referenced evidence source exists
- at least one referenced source explicitly lists the claim id in `supports_claim_ids`

In v0.2.0, a compressed summary is admitted only when every required constraint id survived compression by appearing exactly in `preserved_constraint_ids`.

## What It Does Not Prove

ContextGate is not a full agent harness, an agent framework, or a general agent-safety system. It is not a truth engine. It does not know whether a sentence is true.

It does not call LLMs, verify natural language meaning, verify semantic compression quality, use fuzzy similarity scoring, use embeddings, use a database, run a server, integrate MCP, integrate AgentGate, enforce runtime policy, or connect to any agent framework.

## Local Admission Proofs

ContextGate focuses only on what is allowed into a parent context packet.

Both checks run before parent-context admission. They provide deterministic local checkpoints between an input artifact and the parent-context artifact.

## Scope Rule

ContextGate v0.2 ships exactly two narrow local proofs: v0.1 unsupported claim admission and v0.2 compression audit. It should not grow into a broad agent harness or framework.

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
```

Run the v0.1 unsupported-claim admission gate:

```bash
npm run gate -- --report examples/subagent-report.json --evidence examples/evidence.json --out .contextgate/context-packet.json --quarantine-out .contextgate/quarantine.json
```

Run the v0.2 compression audit ALLOW path:

```bash
npm run audit-compression -- --original examples/original-context.json --summary examples/compressed-summary-valid.json --out .contextgate/compressed-context.json
```

Run the v0.2 compression audit DENY path:

```bash
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
