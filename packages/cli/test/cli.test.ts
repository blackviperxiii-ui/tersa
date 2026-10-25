import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src";

let dir: string;
let logs: string[];
let errors: string[];
const io = { log: (s: string) => logs.push(s), error: (s: string) => errors.push(s) };

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tersa-cli-"));
  logs = [];
  errors = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("tersa cli", () => {
  it("prints help with no arguments and exits 1", () => {
    expect(run([], io, dir)).toBe(1);
    expect(logs.join("\n")).toContain("tersa gen <file.tsa>");
    expect(logs.join("\n")).toContain("tersa check");
  });

  it("prints help and version", () => {
    expect(run(["--help"], io, dir)).toBe(0);
    expect(run(["--version"], io, dir)).toBe(0);
    expect(logs.at(-1)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("rejects unknown commands and options", () => {
    expect(run(["build"], io, dir)).toBe(1);
    expect(errors[0]).toContain('Unknown command "build"');
    expect(run(["gen", "a.tsa", "--wat"], io, dir)).toBe(1);
    expect(run(["gen", "a.tsa", "-o"], io, dir)).toBe(1);
    expect(run(["gen"], io, dir)).toBe(1);
  });

  it("reports a missing input file", () => {
    expect(run(["gen", "missing.tsa"], io, dir)).toBe(1);
    expect(errors[0]).toContain("No such file: missing.tsa");
  });

  it("generates an app into the given directory", () => {
    writeFileSync(path.join(dir, "app.tsa"), 'app "Demo"\npage /home "Home"\n  text "hi"\n');
    expect(run(["gen", "app.tsa", "-o", "build"], io, dir)).toBe(0);
    expect(logs[0]).toMatch(/Generated \d+ files in build\//);
    expect(existsSync(path.join(dir, "build/app/home/page.tsx"))).toBe(true);
    expect(existsSync(path.join(dir, "build/app/home/loading.tsx"))).toBe(true);
    expect(existsSync(path.join(dir, "build/.gitignore"))).toBe(true);
    const pkg = JSON.parse(readFileSync(path.join(dir, "build/package.json"), "utf8"));
    expect(pkg.name).toBe("demo");
  });

  it("check validates specs with exit 0 or 2", () => {
    writeFileSync(path.join(dir, "ok.tsa"), 'app "Demo"\npage /home "Home"\n  text "hi"\n');
    expect(run(["check", "ok.tsa"], io, dir)).toBe(0);
    expect(logs.at(-1)).toContain("ok.tsa: ok");
    writeFileSync(path.join(dir, "bad.tsa"), 'app "Demo"\npage home "Home"\n');
    logs = [];
    errors = [];
    expect(run(["check", "bad.tsa"], io, dir)).toBe(2);
    expect(logs.join("\n")).toContain("E_BAD_PATH");
  });

  it("diff reports changes without writing", () => {
    writeFileSync(path.join(dir, "app.tsa"), 'app "Demo"\npage /home "Home"\n  text "hi"\n');
    expect(run(["gen", "app.tsa", "-o", "out"], io, dir)).toBe(0);
    logs = [];
    expect(run(["diff", "app.tsa", "-o", "out"], io, dir)).toBe(0);
    expect(logs[0]).toContain("No changes");
    writeFileSync(path.join(dir, "app.tsa"), 'app "Demo"\npage /home "Home"\n  text "hello"\n');
    logs = [];
    expect(run(["diff", "app.tsa", "-o", "out"], io, dir)).toBe(1);
    expect(logs.join("\n")).toMatch(/modified/);
  });

  it("init scaffolds app.tsa and out/", () => {
    const project = path.join(dir, "myapp");
    expect(run(["init", "myapp", "--name", "Starter"], io, dir)).toBe(0);
    expect(existsSync(path.join(project, "app.tsa"))).toBe(true);
    expect(existsSync(path.join(project, "out/app/page.tsx"))).toBe(true);
    expect(readFileSync(path.join(project, "app.tsa"), "utf8")).toContain('app "Starter"');
  });

  it("defaults to out/ and exits 2 with a formatted error on invalid specs", () => {
    writeFileSync(path.join(dir, "bad.tsa"), 'app "Demo"\npage home "Home"\n');
    expect(run(["gen", "bad.tsa"], io, dir)).toBe(2);
    expect(errors[0]).toContain("bad.tsa:2:6 error[E_BAD_PATH]");
    expect(existsSync(path.join(dir, "out"))).toBe(false);
  });
});
