import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { compile, formatDiagnostic, TersaError, type Diagnostic } from "@tersa/spec";

export interface CheckOptions {
  inputs: string[];
  cwd?: string;
}

export interface CheckResult {
  ok: boolean;
  files: { file: string; ok: boolean; diagnostics: Diagnostic[] }[];
}

/** Validate one or more `.tsa` files without writing output. */
export function check(options: CheckOptions): CheckResult {
  const cwd = options.cwd ?? process.cwd();
  const files = options.inputs.map((input) => {
    const rel = input;
    const full = path.resolve(cwd, input);
    if (!existsSync(full)) {
      return {
        file: rel,
        ok: false,
        diagnostics: [
          {
            code: "E_NO_FILE",
            message: `No such file: ${rel}`,
            line: 1,
            column: 1,
            length: 1,
          },
        ],
      };
    }
    const source = readFileSync(full, "utf8");
    try {
      compile(source, { file: path.relative(cwd, full) || rel });
      return { file: rel, ok: true, diagnostics: [] };
    } catch (error) {
      if (error instanceof TersaError) {
        return { file: rel, ok: false, diagnostics: error.diagnostics };
      }
      throw error;
    }
  });
  return { ok: files.every((f) => f.ok), files };
}

export function formatCheckResult(result: CheckResult, sourceByFile: Map<string, string>): string {
  const lines: string[] = [];
  for (const f of result.files) {
    if (f.ok) lines.push(`${f.file}: ok`);
    else {
      const source = sourceByFile.get(f.file) ?? "";
      for (const d of f.diagnostics) {
        lines.push(formatDiagnostic(d, source, f.file));
      }
    }
  }
  return lines.join("\n");
}
