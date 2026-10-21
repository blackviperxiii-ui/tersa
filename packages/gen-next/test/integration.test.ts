import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compile } from "@tersa/spec";
import { generate } from "../src";

/**
 * Generates the dashboard example into a temp dir and typechecks it with the real `tsc`,
 * using this package's node_modules (next, react, tailwind...) so no network is needed.
 */
const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const example = readFileSync(path.join(pkgRoot, "../../examples/dashboard/app.tsa"), "utf8");
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tersa-int-"));
  for (const f of generate(compile(example))) {
    const target = path.join(dir, f.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, f.content);
  }
  symlinkSync(path.join(pkgRoot, "node_modules"), path.join(dir, "node_modules"), "dir");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("generated dashboard app", () => {
  it("typechecks with strict TypeScript", { timeout: 120_000 }, () => {
    const tsc = path.join(pkgRoot, "node_modules/typescript/bin/tsc");
    const run = () =>
      execFileSync(process.execPath, [tsc, "--noEmit", "-p", path.join(dir, "tsconfig.json")], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    let output: string;
    try {
      output = run();
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string };
      throw new Error(`tsc failed:\n${e.stdout ?? ""}${e.stderr ?? ""}`, { cause: error });
    }
    expect(output).toBe("");
  });
});
