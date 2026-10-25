import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { generate, type GeneratedFile } from "@tersa/gen-next";
import { compile } from "@tersa/spec";

export type DiffKind = "added" | "removed" | "modified" | "unchanged";

export interface FileDiff {
  path: string;
  kind: DiffKind;
}

export interface DiffOptions {
  input: string;
  out?: string;
  cwd?: string;
}

export interface DiffResult {
  outDir: string;
  files: FileDiff[];
  hasChanges: boolean;
}

function readTree(dir: string, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) {
      for (const [k, v] of readTree(full, rel)) out.set(k, v);
    } else {
      out.set(rel, readFileSync(full, "utf8"));
    }
  }
  return out;
}

/** Compare freshly generated output with files on disk (dry-run for `tersa gen`). */
export function diff(options: DiffOptions): DiffResult {
  const cwd = options.cwd ?? process.cwd();
  const input = path.resolve(cwd, options.input);
  const source = readFileSync(input, "utf8");
  const app = compile(source, { file: path.relative(cwd, input) || options.input });
  const outDir = path.resolve(cwd, options.out ?? "out");
  const next = new Map<string, string>();
  for (const f of generate(app, { existingDir: existsSync(outDir) ? outDir : undefined })) {
    next.set(f.path, f.content);
  }
  const prev = readTree(outDir);
  const paths = new Set([...next.keys(), ...prev.keys()]);
  const files: FileDiff[] = [];
  for (const p of [...paths].sort()) {
    const a = prev.get(p);
    const b = next.get(p);
    if (a === undefined) files.push({ path: p, kind: "added" });
    else if (b === undefined) files.push({ path: p, kind: "removed" });
    else if (a !== b) files.push({ path: p, kind: "modified" });
    else files.push({ path: p, kind: "unchanged" });
  }
  const hasChanges = files.some((f) => f.kind !== "unchanged");
  return { outDir, files, hasChanges };
}

export function formatDiff(result: DiffResult): string {
  const changed = result.files.filter((f) => f.kind !== "unchanged");
  if (!changed.length) {
    return `No changes — ${path.basename(result.outDir)} matches the spec.`;
  }
  const lines = changed.map((f) => {
    const mark = f.kind === "added" ? "+" : f.kind === "removed" ? "-" : "~";
    return `${mark} ${f.path} (${f.kind})`;
  });
  return [`Would update ${changed.length} file(s) in ${result.outDir}:`, ...lines].join("\n");
}

export function plannedFiles(options: DiffOptions): GeneratedFile[] {
  const cwd = options.cwd ?? process.cwd();
  const input = path.resolve(cwd, options.input);
  const source = readFileSync(input, "utf8");
  const app = compile(source, { file: path.relative(cwd, input) || options.input });
  const outDir = path.resolve(cwd, options.out ?? "out");
  return generate(app, { existingDir: existsSync(outDir) ? outDir : undefined });
}
