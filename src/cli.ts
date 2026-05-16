import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { gateReport, type ContextPacket } from "./gate.js";
import {
  evidenceFixtureSchema,
  subagentReportSchema,
  type EvidenceFixture,
  type SubagentReport,
} from "./schemas.js";

type CliArgs = {
  reportPath?: string;
  evidencePath?: string;
  outPath?: string;
};

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);

  if (!args.reportPath || !args.evidencePath) {
    console.error("Usage: npm run gate -- --report <path> --evidence <path> [--out <path>]");
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
    const packet = gateReport(report, evidence);

    if (args.outPath) {
      await mkdir(dirname(args.outPath), { recursive: true });
      await writeFile(args.outPath, `${JSON.stringify(packet, null, 2)}\n`);
    }

    console.log(formatTerminalReport(packet, args.outPath));
    return 0;
  } catch (error) {
    console.error(formatCliError(error));
    return 1;
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

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
  packet: ContextPacket,
  outPath?: string,
): string {
  const lines = [
    "CONTEXTGATE RESULT",
    "",
    `Task: ${packet.task}`,
    `Subagent: ${packet.subagent_id}`,
    "",
    "Admitted claims:",
  ];

  if (packet.admitted_claims.length === 0) {
    lines.push("- none");
  } else {
    for (const claim of packet.admitted_claims) {
      lines.push(`- ${claim.id}: ${claim.text}`);
    }
  }

  lines.push("", "Quarantined claims:");

  if (packet.quarantined_claims.length === 0) {
    lines.push("- none");
  } else {
    for (const claim of packet.quarantined_claims) {
      lines.push(`- ${claim.id}: ${claim.text}`);
      lines.push(`  reason: ${claim.reason}`);
    }
  }

  lines.push("");

  if (outPath) {
    lines.push("Final context packet written to:", outPath);
  } else {
    lines.push("Final context packet not written: no --out path provided.");
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
