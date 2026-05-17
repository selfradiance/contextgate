import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import {
  auditCompression,
  buildAdmittedCompressedContextPacket,
  buildRejectedCompressionAuditArtifact,
  type CompressionAuditResult,
} from "./compression-audit.js";
import {
  buildParentContextPacket,
  gateReport,
  type GateResult,
} from "./gate.js";
import {
  compressedSummarySchema,
  evidenceFixtureSchema,
  originalContextSchema,
  subagentReportSchema,
  type CompressedSummary,
  type EvidenceFixture,
  type OriginalContext,
  type SubagentReport,
} from "./schemas.js";

type GateCliArgs = {
  reportPath?: string;
  evidencePath?: string;
  outPath?: string;
  quarantineOutPath?: string;
};

type CompressionAuditCliArgs = {
  originalPath?: string;
  summaryPath?: string;
  outPath?: string;
  rejectedOutPath?: string;
};

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const command = getCommand(argv);
  const commandArgs = getCommandArgs(argv, command);

  if (command === "audit-compression") {
    return runCompressionAudit(commandArgs);
  }

  return runGate(commandArgs);
}

async function runGate(argv: string[]): Promise<number> {
  const args = parseGateArgs(argv);

  if (!args.reportPath || !args.evidencePath) {
    console.error(
      "Usage: npm run gate -- --report <path> --evidence <path> [--out <path>] [--quarantine-out <path>]",
    );
    return 1;
  }

  try {
    const report = await readJsonFile<SubagentReport>(
      args.reportPath,
      subagentReportSchema.parse,
    );
    const evidence = await readJsonFile<EvidenceFixture>(
      args.evidencePath,
      evidenceFixtureSchema.parse,
    );
    const result = gateReport(report, evidence);
    const parentContextPacket = buildParentContextPacket(result);

    if (args.outPath) {
      await mkdir(dirname(args.outPath), { recursive: true });
      await writeFile(
        args.outPath,
        `${JSON.stringify(parentContextPacket, null, 2)}\n`,
      );
    }

    if (args.quarantineOutPath) {
      await mkdir(dirname(args.quarantineOutPath), { recursive: true });
      await writeFile(
        args.quarantineOutPath,
        `${JSON.stringify(result.quarantined_claims, null, 2)}\n`,
      );
    }

    console.log(
      formatTerminalReport(result, args.outPath, args.quarantineOutPath),
    );
    return 0;
  } catch (error) {
    console.error(formatCliError(error));
    return 1;
  }
}

async function runCompressionAudit(argv: string[]): Promise<number> {
  const args = parseCompressionAuditArgs(argv);

  if (!args.originalPath || !args.summaryPath || !args.outPath) {
    console.error(
      "Usage: npm run audit-compression -- --original <path> --summary <path> --out <path> [--rejected-out <path>]",
    );
    return 1;
  }

  try {
    const original = await readJsonFile<OriginalContext>(
      args.originalPath,
      originalContextSchema.parse,
    );
    const compressed = await readJsonFile<CompressedSummary>(
      args.summaryPath,
      compressedSummarySchema.parse,
    );
    const result = auditCompression(original, compressed);

    if (result.decision === "allow") {
      const packet = buildAdmittedCompressedContextPacket(result);
      await mkdir(dirname(args.outPath), { recursive: true });
      await writeFile(args.outPath, `${JSON.stringify(packet, null, 2)}\n`);
    } else {
      await rm(args.outPath, { force: true });

      if (args.rejectedOutPath) {
        const rejectedArtifact = buildRejectedCompressionAuditArtifact(result);
        await mkdir(dirname(args.rejectedOutPath), { recursive: true });
        await writeFile(
          args.rejectedOutPath,
          `${JSON.stringify(rejectedArtifact, null, 2)}\n`,
        );
      }
    }

    console.log(
      formatCompressionAuditReport(
        result,
        args.outPath,
        args.rejectedOutPath,
      ),
    );
    return 0;
  } catch (error) {
    console.error(formatCliError(error));
    return 1;
  }
}

function getCommand(argv: string[]): "gate" | "audit-compression" {
  if (argv[0] === "audit-compression") {
    return "audit-compression";
  }

  return "gate";
}

function getCommandArgs(
  argv: string[],
  command: "gate" | "audit-compression",
): string[] {
  if (command === "audit-compression") {
    return argv.slice(1);
  }

  return argv[0] === "gate" ? argv.slice(1) : argv;
}

function parseGateArgs(argv: string[]): GateCliArgs {
  const args: GateCliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];

    if (name === "--report") {
      args.reportPath = value;
      index += 1;
      continue;
    }

    if (name === "--evidence") {
      args.evidencePath = value;
      index += 1;
      continue;
    }

    if (name === "--out") {
      args.outPath = value;
      index += 1;
      continue;
    }

    if (name === "--quarantine-out") {
      args.quarantineOutPath = value;
      index += 1;
    }
  }

  return args;
}

function parseCompressionAuditArgs(argv: string[]): CompressionAuditCliArgs {
  const args: CompressionAuditCliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];

    if (name === "--original") {
      args.originalPath = value;
      index += 1;
      continue;
    }

    if (name === "--summary") {
      args.summaryPath = value;
      index += 1;
      continue;
    }

    if (name === "--out") {
      args.outPath = value;
      index += 1;
      continue;
    }

    if (name === "--rejected-out") {
      args.rejectedOutPath = value;
      index += 1;
    }
  }

  return args;
}

async function readJsonFile<T>(
  path: string,
  validate: (value: unknown) => T,
): Promise<T> {
  const raw = await readFile(path, "utf8");
  return validate(JSON.parse(raw));
}

export function formatTerminalReport(
  result: GateResult,
  outPath?: string,
  quarantineOutPath?: string,
): string {
  const lines = [
    "CONTEXTGATE RESULT",
    "",
    `Task: ${result.task}`,
    `Subagent: ${result.subagent_id}`,
    "",
    "Admitted claims:",
  ];

  if (result.admitted_claims.length === 0) {
    lines.push("- none");
  } else {
    for (const claim of result.admitted_claims) {
      lines.push(`- ${claim.id}: ${claim.text}`);
    }
  }

  lines.push("", "Quarantined claims:");

  if (result.quarantined_claims.length === 0) {
    lines.push("- none");
  } else {
    for (const claim of result.quarantined_claims) {
      lines.push(`- ${claim.id}: ${claim.text}`);
      lines.push(`  reason: ${claim.reason}`);
    }
  }

  lines.push("");

  if (outPath) {
    lines.push("Parent context packet written to:", outPath);
  } else {
    lines.push("Parent context packet not written: no --out path provided.");
  }

  if (quarantineOutPath) {
    lines.push("Quarantine artifact written to:", quarantineOutPath);
  }

  return lines.join("\n");
}

export function formatCompressionAuditReport(
  result: CompressionAuditResult,
  outPath: string,
  rejectedOutPath?: string,
): string {
  const decision = result.decision.toUpperCase();
  const lines = [
    "COMPRESSION AUDIT RESULT",
    "",
    `Decision: ${decision}`,
    `Original context: ${result.context_id}`,
    "",
    "Required constraint ids:",
  ];

  for (const id of result.required_constraint_ids) {
    lines.push(`- ${id}`);
  }

  lines.push("", "Preserved constraint ids:");

  if (result.preserved_constraint_ids.length === 0) {
    lines.push("- none");
  } else {
    for (const id of result.preserved_constraint_ids) {
      lines.push(`- ${id}`);
    }
  }

  lines.push("", "Missing constraint ids:");

  if (result.missing_constraint_ids.length === 0) {
    lines.push("- none");
  } else {
    for (const id of result.missing_constraint_ids) {
      lines.push(`- ${id}`);
    }
  }

  lines.push("");

  if (result.decision === "allow") {
    lines.push("Admitted compressed context packet written to:", outPath);
  } else {
    lines.push(
      "Admitted compressed context packet not written: compression audit denied.",
    );

    if (rejectedOutPath) {
      lines.push(
        "Rejected compression audit artifact written to:",
        rejectedOutPath,
      );
    } else {
      lines.push(
        "Rejected compression audit artifact not written: no --rejected-out path provided.",
      );
    }
  }

  return lines.join("\n");
}

function formatCliError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return `Invalid JSON: ${error.message}`;
  }

  if (error instanceof ZodError) {
    return `Invalid input shape: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

const thisFile = fileURLToPath(import.meta.url);

if (process.argv[1] === thisFile) {
  main().then((code) => {
    process.exitCode = code;
  });
}
