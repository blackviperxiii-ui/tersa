export interface Diagnostic {
  code: string;
  message: string;
  /** 1-based line. */
  line: number;
  /** 1-based column. */
  column: number;
  /** Number of characters to underline. */
  length: number;
  hint?: string;
}

export function formatDiagnostic(d: Diagnostic, source: string, file = "<input>"): string {
  const srcLine = source.split(/\r?\n/)[d.line - 1] ?? "";
  const gutter = String(d.line);
  const pad = " ".repeat(gutter.length);
  const caret = `${" ".repeat(Math.max(0, d.column - 1))}${"^".repeat(Math.max(1, d.length))}`;
  const out = [
    `${file}:${d.line}:${d.column} error[${d.code}]: ${d.message}`,
    `${gutter} | ${srcLine}`,
    `${pad} | ${caret}`,
  ];
  if (d.hint) out.push(`${pad} = hint: ${d.hint}`);
  return out.join("\n");
}

export class TersaError extends Error {
  readonly diagnostics: Diagnostic[];
  readonly source: string;
  readonly file: string;

  constructor(diagnostics: Diagnostic[], source: string, file = "<input>") {
    const body = diagnostics.map((d) => formatDiagnostic(d, source, file)).join("\n\n");
    const n = diagnostics.length;
    super(`${body}\n\n${n} error${n === 1 ? "" : "s"} in ${file}`);
    this.name = "TersaError";
    this.diagnostics = diagnostics;
    this.source = source;
    this.file = file;
  }
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from(
    { length: a.length + 1 },
    (_, i) => [i, ...Array(b.length).fill(0)] as number[],
  );
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

/** Closest candidate within edit distance 2, if any. */
export function suggest(word: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestD = 3;
  for (const c of candidates) {
    const d = levenshtein(word.toLowerCase(), c.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
