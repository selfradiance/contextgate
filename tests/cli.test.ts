import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cliPath = join(process.cwd(), "src", "cli.ts");
const tsxPath = join(process.cwd(), "node_modules", ".bin", "tsx");

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  tempDirs = [];
});

describe("CLI", () => {
  it("writes output file", async () => {
    const tempDir = await makeTempDir();
    const outPath = join(tempDir, "context-packet.json");

    await execFileAsync(tsxPath, [
      cliPath,
      "--report",
      "examples/subagent-report.json",
      "--evidence",
      "examples/evidence.json",
      "--out",
      outPath,
    ]);

    const packet = JSON.parse(await readFile(outPath, "utf8"));
    expect(packet.decision).toBe("partial");
    expect(packet.admitted_claims).toHaveLength(1);
    expect(packet.quarantined_claims).toBeUndefined();
    expect(JSON.stringify(packet)).not.toContain(
      "VIP customers get refunds after 90 days.",
    );
  });

  it("writes quarantine claims only to the separate quarantine artifact", async () => {
    const tempDir = await makeTempDir();
    const outPath = join(tempDir, "context-packet.json");
    const quarantineOutPath = join(tempDir, "quarantine.json");

    await execFileAsync(tsxPath, [
      cliPath,
      "--report",
      "examples/subagent-report.json",
      "--evidence",
      "examples/evidence.json",
      "--out",
      outPath,
      "--quarantine-out",
      quarantineOutPath,
    ]);

    const packet = JSON.parse(await readFile(outPath, "utf8"));
    const quarantine = JSON.parse(await readFile(quarantineOutPath, "utf8"));

    expect(packet.quarantined_claims).toBeUndefined();
    expect(quarantine).toHaveLength(1);
    expect(quarantine[0]).toMatchObject({
      id: "claim-2",
      reason: "NO_SUPPORTING_SOURCE",
    });
  });

  it("exits nonzero for invalid JSON", async () => {
    const tempDir = await makeTempDir();
    const invalidPath = join(tempDir, "invalid.json");
    await writeFile(invalidPath, "{ nope");

    await expect(
      execFileAsync(tsxPath, [
        cliPath,
        "--report",
        invalidPath,
        "--evidence",
        "examples/evidence.json",
      ]),
    ).rejects.toMatchObject({ code: 1 });
  });

  it("exits nonzero for missing required args", async () => {
    await expect(execFileAsync(tsxPath, [cliPath])).rejects.toMatchObject({
      code: 1,
    });
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "contextgate-"));
  tempDirs.push(dir);
  return dir;
}
