import type { Diagnostic } from "./errors";

export type Token =
  | { kind: "string"; value: string; column: number; length: number }
  | { kind: "bind"; value: string; column: number; length: number }
  | { kind: "id"; value: string; column: number; length: number }
  | { kind: "variant"; value: string; column: number; length: number }
  | { kind: "arrow"; target: string; column: number; length: number; targetColumn: number }
  | {
      kind: "prop";
      key: string;
      value: string;
      column: number;
      length: number;
      valueColumn: number;
    }
  | { kind: "word"; value: string; column: number; length: number };

const BIND_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const ID_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const VARIANT_RE = /^[a-z][a-z-]*$/;
const PROP_RE = /^([A-Za-z_][A-Za-z0-9_-]*)=/;

const isSpace = (c: string | undefined) => c === " " || c === "\t";

/**
 * Tokenize the content of one line (indentation already removed).
 * `offset` is the number of characters removed, so columns stay 1-based on the full line.
 */
export function tokenizeLine(
  text: string,
  offset: number,
  line: number,
  diags: Diagnostic[],
): Token[] {
  const tokens: Token[] = [];
  const n = text.length;
  let i = 0;

  const report = (code: string, message: string, col: number, length: number, hint?: string) =>
    diags.push({ code, message, line, column: col, length, ...(hint ? { hint } : {}) });

  const readRun = (from: number) => {
    let j = from;
    while (j < n && !isSpace(text[j])) j++;
    return j;
  };

  /** Reads a quoted string starting at `from` (which must be a quote). */
  const readString = (from: number) => {
    let j = from + 1;
    let value = "";
    while (j < n) {
      const c = text[j]!;
      if (c === "\\" && j + 1 < n) {
        const nx = text[j + 1]!;
        value += nx === "n" ? "\n" : nx;
        j += 2;
        continue;
      }
      if (c === '"') return { value, end: j + 1, closed: true };
      value += c;
      j++;
    }
    return { value, end: n, closed: false };
  };

  while (i < n) {
    const ch = text[i]!;
    if (isSpace(ch)) {
      i++;
      continue;
    }
    const col = offset + i + 1;

    if (ch === '"') {
      const s = readString(i);
      if (!s.closed) {
        report("E_UNTERMINATED_STRING", "unterminated string", col, n - i, 'add a closing "');
      }
      tokens.push({ kind: "string", value: s.value, column: col, length: s.end - i });
      i = s.end;
      continue;
    }

    if (ch === "@" || ch === "#" || ch === "~") {
      const end = readRun(i);
      const value = text.slice(i + 1, end);
      const kind = ch === "@" ? "bind" : ch === "#" ? "id" : "variant";
      const re = kind === "bind" ? BIND_RE : kind === "id" ? ID_RE : VARIANT_RE;
      if (!re.test(value)) {
        const what = kind === "bind" ? "data binding" : kind === "id" ? "id" : "variant";
        report(
          `E_BAD_${kind.toUpperCase()}`,
          `invalid ${what} "${text.slice(i, end)}"`,
          col,
          end - i,
          kind === "bind"
            ? "use letters, digits and underscores, with optional dots: @metrics or @user.profile"
            : kind === "id"
              ? "use letters, digits, underscores and dashes: #main-chart"
              : "use lowercase letters: ~destructive",
        );
      } else {
        tokens.push({ kind, value, column: col, length: end - i } as Token);
      }
      i = end;
      continue;
    }

    if (ch === "-" && text[i + 1] === ">" && (i + 2 >= n || isSpace(text[i + 2]))) {
      let j = i + 2;
      while (j < n && isSpace(text[j])) j++;
      if (j >= n) {
        report(
          "E_MISSING_ACTION_TARGET",
          'expected an action after "->"',
          col,
          2,
          "write -> api.name, -> api.name(arg) or -> /path",
        );
        i = n;
        continue;
      }
      const end = readRun(j);
      tokens.push({
        kind: "arrow",
        target: text.slice(j, end),
        column: col,
        length: end - i,
        targetColumn: offset + j + 1,
      });
      i = end;
      continue;
    }

    const prop = PROP_RE.exec(text.slice(i));
    if (prop) {
      const key = prop[1]!;
      const vStart = i + prop[0].length;
      let value: string;
      let end: number;
      if (text[vStart] === '"') {
        const s = readString(vStart);
        if (!s.closed) {
          report("E_UNTERMINATED_STRING", "unterminated string", offset + vStart + 1, n - vStart);
        }
        value = s.value;
        end = s.end;
      } else {
        end = readRun(vStart);
        value = text.slice(vStart, end);
      }
      if (value === "") {
        report(
          "E_EMPTY_PROP",
          `prop "${key}" has no value`,
          col,
          prop[0].length,
          `write ${key}=value`,
        );
      }
      tokens.push({
        kind: "prop",
        key,
        value,
        column: col,
        length: end - i,
        valueColumn: offset + vStart + 1,
      });
      i = end;
      continue;
    }

    const end = readRun(i);
    tokens.push({ kind: "word", value: text.slice(i, end), column: col, length: end - i });
    i = end;
  }
  return tokens;
}
