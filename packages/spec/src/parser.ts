import type {
  ActionRef,
  AppNode,
  ButtonVariant,
  ColumnDef,
  FieldDef,
  Node,
  TextVariant,
} from "./ast";
import { suggest, type Diagnostic } from "./errors";
import {
  BUTTON_VARIANTS,
  CHART_KINDS,
  COLUMN_TYPES,
  FIELD_TYPES,
  HERO_ALIGNS,
  KPI_FORMATS,
  NAV_MODES,
  NODE_SPECS,
  NODE_TYPES,
  TEXT_VARIANTS,
  THEMES,
  type NodeSpec,
  type NodeType,
} from "./specs";
import { tokenizeLine, type Token } from "./tokenize";

export interface ParseResult {
  app?: AppNode;
  diagnostics: Diagnostic[];
}

type Tok<K extends Token["kind"]> = Extract<Token, { kind: K }>;

interface Raw {
  spec: NodeSpec;
  line: number;
  column: number;
  text?: Tok<"string">;
  bind?: Tok<"bind">;
  id?: Tok<"id">;
  variant?: Tok<"variant">;
  action?: Tok<"arrow">;
  props: Map<string, Tok<"prop">>;
  flags: Set<string>;
  positional: Map<string, Tok<"word">>;
}

type Report = (
  code: string,
  message: string,
  column: number,
  length: number,
  hint?: string,
) => void;

const list = (xs: readonly string[]) => xs.map((x) => `"${x}"`).join(", ");

function resolve(
  spec: NodeSpec,
  tokens: Token[],
  line: number,
  column: number,
  report: Report,
  lineHasErrors: () => boolean,
) {
  const raw: Raw = {
    spec,
    line,
    column,
    props: new Map(),
    flags: new Set(),
    positional: new Map(),
  };
  const type = spec.type;
  let slot = 0;

  for (const t of tokens) {
    switch (t.kind) {
      case "string":
        if (spec.text === "none") {
          report(
            "E_UNEXPECTED_TEXT",
            `"${type}" does not take quoted text`,
            t.column,
            t.length,
            `usage: ${spec.usage}`,
          );
        } else if (raw.text) {
          report("E_DUPLICATE", "quoted text given twice", t.column, t.length);
        } else raw.text = t;
        break;
      case "bind":
        if (spec.bind === "none") {
          report(
            "E_UNEXPECTED_BIND",
            `"${type}" does not take a data binding`,
            t.column,
            t.length,
            `usage: ${spec.usage}`,
          );
        } else if (raw.bind) {
          report("E_DUPLICATE", "data binding given twice", t.column, t.length);
        } else raw.bind = t;
        break;
      case "id":
        if (raw.id) report("E_DUPLICATE", "id given twice", t.column, t.length);
        else raw.id = t;
        break;
      case "variant":
        if (!spec.variant) {
          report(
            "E_UNEXPECTED_VARIANT",
            `"${type}" does not take a variant`,
            t.column,
            t.length,
            `usage: ${spec.usage}`,
          );
        } else if (raw.variant) {
          report("E_DUPLICATE", "variant given twice", t.column, t.length);
        } else raw.variant = t;
        break;
      case "arrow":
        if (spec.action === "none") {
          report(
            "E_UNEXPECTED_ACTION",
            `"${type}" does not take an action`,
            t.column,
            t.length,
            `usage: ${spec.usage}`,
          );
        } else if (raw.action) {
          report("E_DUPLICATE", "action given twice", t.column, t.length);
        } else raw.action = t;
        break;
      case "prop":
        if (!spec.props.includes(t.key)) {
          const s = suggest(t.key, spec.props);
          report(
            "E_UNKNOWN_PROP",
            `unknown prop "${t.key}" on "${type}"`,
            t.column,
            t.key.length,
            s
              ? `did you mean "${s}"?`
              : spec.props.length
                ? `allowed props: ${list(spec.props)}`
                : `"${type}" takes no props`,
          );
        } else if (raw.props.has(t.key)) {
          report("E_DUPLICATE", `prop "${t.key}" given twice`, t.column, t.length);
        } else raw.props.set(t.key, t);
        break;
      case "word":
        if (spec.flags.includes(t.value)) {
          if (raw.flags.has(t.value))
            report("E_DUPLICATE", `flag "${t.value}" given twice`, t.column, t.length);
          raw.flags.add(t.value);
        } else if (slot < spec.positional.length) {
          raw.positional.set(spec.positional[slot]!, t);
          slot++;
        } else {
          const s = suggest(t.value, spec.flags);
          report(
            "E_UNEXPECTED_ARG",
            `unexpected "${t.value}" on "${type}"`,
            t.column,
            t.length,
            s ? `did you mean the flag "${s}"?` : `usage: ${spec.usage}`,
          );
        }
        break;
    }
  }

  let ok = true;
  // A typo or bad token already explains why something is missing, so don't pile on.
  const clean = !lineHasErrors();
  const missing = (code: string, message: string) => {
    ok = false;
    if (clean) report(code, message, column, type.length, `usage: ${spec.usage}`);
  };
  if (spec.text === "required" && !raw.text)
    missing("E_MISSING_TEXT", `"${type}" needs quoted text`);
  if (spec.bind === "required" && !raw.bind)
    missing("E_MISSING_BIND", `"${type}" needs a data binding like @name`);
  if (spec.action === "required" && !raw.action)
    missing("E_MISSING_ACTION", `"${type}" needs an action like -> api.name`);
  for (const p of spec.requiredProps) {
    if (!raw.props.has(p)) missing("E_MISSING_PROP", `"${type}" needs ${p}=...`);
  }
  for (const p of spec.requiredPositional) {
    if (!raw.positional.has(p)) missing("E_MISSING_ARG", `"${type}" needs a ${p} argument`);
  }
  return { raw, ok };
}

// ---------------------------------------------------------------------------
// value parsers

function parseEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  what: string,
  column: number,
  report: Report,
): T | undefined {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  const s = suggest(value, allowed);
  report(
    "E_BAD_VALUE",
    `unknown ${what} "${value}"`,
    column,
    Math.max(1, value.length),
    s ? `did you mean "${s}"?` : `allowed: ${list(allowed)}`,
  );
  return undefined;
}

function parseIntIn(
  value: string,
  min: number,
  max: number,
  what: string,
  column: number,
  report: Report,
): number | undefined {
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    if (n >= min && n <= max) return n;
  }
  report(
    "E_BAD_VALUE",
    `${what} must be an integer from ${min} to ${max}, got "${value}"`,
    column,
    Math.max(1, value.length),
  );
  return undefined;
}

function parseAction(tok: Tok<"arrow">, report: Report): ActionRef | undefined {
  const { target, targetColumn: col } = tok;
  const api = /^api\.([A-Za-z_][A-Za-z0-9_]*)(?:\(([^)]*)\))?$/.exec(target);
  if (api) {
    const args = (api[2] ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a !== "");
    const bad = args.find((a) => !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(a));
    if (bad) {
      report(
        "E_BAD_ACTION",
        `invalid action argument "${bad}"`,
        col,
        target.length,
        "arguments are field names: api.refund(id)",
      );
      return undefined;
    }
    return { kind: "api", fn: api[1]!, args, raw: target };
  }
  if (/^\/([A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*)?$/.test(target)) {
    return { kind: "nav", to: target, raw: target };
  }
  report(
    "E_BAD_ACTION",
    `invalid action "${target}"`,
    col,
    target.length,
    "use api.name, api.name(arg, ...) or a /path (no spaces)",
  );
  return undefined;
}

function parseCols(value: string, startCol: number, report: Report): ColumnDef[] | undefined {
  const out: ColumnDef[] = [];
  const seen = new Set<string>();
  let ok = true;
  let off = 0;
  for (const part of value.split(",")) {
    const col = startCol + off;
    off += part.length + 1;
    const [key = "", type, ...rest] = part.split(":");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || rest.length > 0) {
      report(
        "E_BAD_COLS",
        `invalid column "${part}"`,
        col,
        Math.max(1, part.length),
        "use key or key:type, e.g. total:money",
      );
      ok = false;
      continue;
    }
    let t: ColumnDef["type"] = "text";
    if (type !== undefined) {
      const parsed = parseEnum(type, COLUMN_TYPES, "column type", col + key.length + 1, report);
      if (!parsed) {
        ok = false;
        continue;
      }
      t = parsed;
    }
    if (seen.has(key)) {
      report("E_BAD_COLS", `duplicate column "${key}"`, col, key.length);
      ok = false;
      continue;
    }
    seen.add(key);
    out.push({ key, type: t });
  }
  return ok ? out : undefined;
}

function splitTopLevel(value: string): { text: string; offset: number }[] {
  const parts: { text: string; offset: number }[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= value.length; i++) {
    const c = value[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    if ((c === "," && depth === 0) || i === value.length) {
      parts.push({ text: value.slice(start, i), offset: start });
      start = i + 1;
    }
  }
  return parts;
}

function parseFields(value: string, startCol: number, report: Report): FieldDef[] | undefined {
  const out: FieldDef[] = [];
  const seen = new Set<string>();
  let ok = true;
  for (const { text, offset } of splitTopLevel(value)) {
    const col = startCol + offset;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)(?::([a-z]+)(?:\(([^)]*)\))?)?$/.exec(text);
    if (!m) {
      report(
        "E_BAD_FIELDS",
        `invalid field "${text}"`,
        col,
        Math.max(1, text.length),
        "use name, name:type or name:select(a|b)",
      );
      ok = false;
      continue;
    }
    const name = m[1]!;
    let type: FieldDef["type"] = "text";
    if (m[2] !== undefined) {
      const parsed = parseEnum(m[2], FIELD_TYPES, "field type", col + name.length + 1, report);
      if (!parsed) {
        ok = false;
        continue;
      }
      type = parsed;
    }
    const field: FieldDef = { name, type };
    if (type === "select") {
      const opts = (m[3] ?? "").split("|").map((o) => o.trim());
      if (m[3] === undefined || opts.some((o) => o === "")) {
        report(
          "E_BAD_FIELDS",
          `select field "${name}" needs options`,
          col,
          text.length,
          "write plan:select(free|pro)",
        );
        ok = false;
        continue;
      }
      field.options = opts;
    } else if (m[3] !== undefined) {
      report("E_BAD_FIELDS", `only select fields take options, not "${type}"`, col, text.length);
      ok = false;
      continue;
    }
    if (seen.has(name)) {
      report("E_BAD_FIELDS", `duplicate field "${name}"`, col, name.length);
      ok = false;
      continue;
    }
    seen.add(name);
    out.push(field);
  }
  return ok ? out : undefined;
}

// ---------------------------------------------------------------------------
// node builders

function build(raw: Raw, report: Report): Node | null {
  const { spec } = raw;
  const base = {
    ...(raw.id ? { id: raw.id.value } : {}),
    loc: { line: raw.line, column: raw.column },
    children: [] as Node[],
  };
  const text = raw.text?.value;
  const prop = (k: string) => raw.props.get(k);
  let failed = false;
  const fail = <T>(v: T | undefined): T | undefined => {
    if (v === undefined) failed = true;
    return v;
  };
  const variantOf = <T extends string>(allowed: readonly T[], dflt: T): T => {
    if (!raw.variant) return dflt;
    return (
      fail(parseEnum(raw.variant.value, allowed, "variant", raw.variant.column + 1, report)) ?? dflt
    );
  };
  const actionOf = () => (raw.action ? fail(parseAction(raw.action, report)) : undefined);
  const done = <N extends Node>(n: N): N | null => (failed ? null : n);

  switch (spec.type) {
    case "app": {
      if (text!.trim() === "") {
        report("E_MISSING_TEXT", "app name cannot be empty", raw.text!.column, raw.text!.length);
        return null;
      }
      const t = prop("theme");
      const nav = prop("nav");
      const theme = t ? fail(parseEnum(t.value, THEMES, "theme", t.valueColumn, report)) : "aurora";
      const navMode = nav
        ? fail(parseEnum(nav.value, NAV_MODES, "nav mode", nav.valueColumn, report))
        : "sidebar";
      return done({
        ...base,
        type: "app",
        name: text!,
        theme: theme ?? "aurora",
        dark: raw.flags.has("dark"),
        nav: navMode ?? "sidebar",
      });
    }
    case "page": {
      const p = raw.positional.get("path")!;
      if (!/^\/([A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*)?$/.test(p.value)) {
        report(
          "E_BAD_PATH",
          `invalid page path "${p.value}"`,
          p.column,
          p.length,
          'start with / and use letters, digits, - and _: page /settings "Settings"',
        );
        return null;
      }
      return done({ ...base, type: "page", path: p.value, title: text! });
    }
    case "row": {
      const r = raw.positional.get("repeat");
      let repeat: { of: "kpi"; count: number } | undefined;
      if (r) {
        const m = /^([a-z]+)\*(\d+)$/.exec(r.value);
        if (!m) {
          report("E_BAD_VALUE", `invalid repeat "${r.value}"`, r.column, r.length, "write kpi*4");
          failed = true;
        } else if (m[1] !== "kpi") {
          report(
            "E_BAD_VALUE",
            `rows can only repeat "kpi", not "${m[1]}"`,
            r.column,
            r.length,
            "write kpi*4",
          );
          failed = true;
        } else {
          const count = fail(
            parseIntIn(m[2]!, 1, 12, "repeat count", r.column + m[1]!.length + 1, report),
          );
          if (count !== undefined) repeat = { of: "kpi", count };
        }
      }
      return done({
        ...base,
        type: "row",
        ...(repeat ? { repeat } : {}),
        ...(raw.bind ? { bind: raw.bind.value } : {}),
      });
    }
    case "grid": {
      const c = raw.positional.get("cols")!;
      const cols = fail(parseIntIn(c.value, 1, 6, "grid columns", c.column, report));
      return done({ ...base, type: "grid", cols: cols ?? 1 });
    }
    case "card":
      return done({ ...base, type: "card", ...(text !== undefined ? { title: text } : {}) });
    case "hero": {
      const a = prop("align");
      const align = a
        ? fail(parseEnum(a.value, HERO_ALIGNS, "align", a.valueColumn, report))
        : "center";
      return done({
        ...base,
        type: "hero",
        title: text!,
        ...(prop("subtitle") ? { subtitle: prop("subtitle")!.value } : {}),
        align: align ?? "center",
      });
    }
    case "features": {
      const c = prop("cols");
      const cols = c ? fail(parseIntIn(c.value, 1, 4, "columns", c.valueColumn, report)) : 3;
      return done({
        ...base,
        type: "features",
        bind: raw.bind!.value,
        cols: cols ?? 3,
        ...(text !== undefined ? { title: text } : {}),
      });
    }
    case "cta":
      return done({
        ...base,
        type: "cta",
        title: text!,
        ...(prop("subtitle") ? { subtitle: prop("subtitle")!.value } : {}),
      });
    case "kpi": {
      const f = prop("format");
      const format = f
        ? fail(parseEnum(f.value, KPI_FORMATS, "format", f.valueColumn, report))
        : "number";
      return done({
        ...base,
        type: "kpi",
        ...(text !== undefined ? { label: text } : {}),
        bind: raw.bind!.value,
        format: format ?? "number",
      });
    }
    case "chart": {
      const k = raw.positional.get("kind")!;
      const kind = fail(parseEnum(k.value, CHART_KINDS, "chart kind", k.column, report));
      return done({
        ...base,
        type: "chart",
        kind: kind ?? "line",
        bind: raw.bind!.value,
        x: prop("x")!.value,
        y: prop("y")?.value ?? "value",
        ...(text !== undefined ? { title: text } : {}),
      });
    }
    case "table": {
      const c = prop("cols")!;
      const cols = fail(parseCols(c.value, c.valueColumn, report));
      const pg = prop("page");
      const pageSize = pg
        ? fail(parseIntIn(pg.value, 1, 200, "page size", pg.valueColumn, report))
        : 10;
      return done({
        ...base,
        type: "table",
        bind: raw.bind!.value,
        cols: cols ?? [],
        sort: raw.flags.has("sort"),
        search: raw.flags.has("search"),
        pageSize: pageSize ?? 10,
        ...(text !== undefined ? { title: text } : {}),
      });
    }
    case "form": {
      const f = prop("fields")!;
      const fields = fail(parseFields(f.value, f.valueColumn, report));
      const action = actionOf();
      return done({
        ...base,
        type: "form",
        ...(raw.bind ? { bind: raw.bind.value } : {}),
        fields: fields ?? [],
        action: action ?? { kind: "api", fn: "submit", args: [], raw: "api.submit" },
        ...(text !== undefined ? { title: text } : {}),
        submitLabel: prop("submit")?.value ?? "Save",
      });
    }
    case "button": {
      const action = actionOf();
      return done({
        ...base,
        type: "button",
        label: text!,
        variant: variantOf(BUTTON_VARIANTS, "default" as ButtonVariant),
        ...(action ? { action } : {}),
      });
    }
    case "text":
      return done({
        ...base,
        type: "text",
        text: text!,
        variant: variantOf(TEXT_VARIANTS, "default" as TextVariant),
      });
    case "action": {
      const action = actionOf();
      return done({
        ...base,
        type: "action",
        label: text!,
        variant: variantOf(BUTTON_VARIANTS, "default" as ButtonVariant),
        action: action ?? { kind: "api", fn: "submit", args: [], raw: "api.submit" },
        confirm: raw.flags.has("confirm"),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// line / tree handling

interface Frame {
  node: Node | null;
}

export function parse(source: string): ParseResult {
  const diagnostics: Diagnostic[] = [];
  const lines = source.split(/\r?\n/);
  let app: AppNode | undefined;
  let sawRoot = false;
  let rootCount = 0;
  const stack: Frame[] = [];

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li]!;
    const line = li + 1;
    const report: Report = (code, message, column, length, hint) =>
      diagnostics.push({ code, message, line, column, length, ...(hint ? { hint } : {}) });

    if (/^\s*(#(\s|$)|$)/.test(rawLine)) continue;

    let indent = 0;
    let idx = 0;
    while (idx < rawLine.length && (rawLine[idx] === " " || rawLine[idx] === "\t")) {
      if (rawLine[idx] === "\t") {
        report(
          "E_TAB_INDENT",
          "tabs are not allowed for indentation",
          idx + 1,
          1,
          "indent with 2 spaces per level",
        );
        indent += 2;
      } else indent += 1;
      idx++;
    }
    if (indent % 2 !== 0) {
      report(
        "E_BAD_INDENT",
        `indentation must be a multiple of 2 spaces, found ${indent}`,
        1,
        indent,
        "use 2 spaces per level",
      );
    }
    let level = Math.floor(indent / 2);
    if (level > stack.length) {
      report(
        "E_BAD_INDENT",
        `indentation jumps ${level - stack.length + 1} levels at once`,
        1,
        indent,
        `indent at most ${stack.length * 2} spaces here`,
      );
      level = stack.length;
    }
    stack.length = level;

    const content = rawLine.slice(idx);
    const word = /^[^\s]+/.exec(content)![0];
    const typeCol = idx + 1;
    let node: Node | null = null;

    if (!/^[A-Za-z]+$/.test(word)) {
      report(
        "E_EXPECTED_NODE",
        `expected a node type at the start of the line, found "${word}"`,
        typeCol,
        word.length,
        `node types: ${NODE_TYPES.join(", ")}`,
      );
    } else if (!(NODE_TYPES as readonly string[]).includes(word)) {
      const s = suggest(word, NODE_TYPES);
      report(
        "E_UNKNOWN_NODE",
        `unknown node type "${word}"`,
        typeCol,
        word.length,
        s ? `did you mean "${s}"?` : `node types: ${NODE_TYPES.join(", ")}`,
      );
    } else {
      const spec = NODE_SPECS[word as NodeType];
      const tokens = tokenizeLine(content.slice(word.length), idx + word.length, line, diagnostics);
      const { raw, ok } = resolve(spec, tokens, line, typeCol, report, () =>
        diagnostics.some((d) => d.line === line),
      );
      if (ok) node = build(raw, report);
    }

    if (level === 0) {
      rootCount++;
      if (!sawRoot) {
        sawRoot = true;
        if (node?.type === "app") app = node;
        else if (node) {
          report(
            "E_EXPECTED_APP",
            `the first node must be "app", found "${node.type}"`,
            typeCol,
            node.type.length,
            'start with: app "My App"',
          );
        }
      } else if (node) {
        if (node.type === "page") app?.children.push(node);
        else if (node.type === "app") {
          report(
            "E_MULTIPLE_APP",
            "only one app line is allowed",
            typeCol,
            node.type.length,
            "keep a single app line at the top",
          );
        } else {
          report(
            "E_EXPECTED_PAGE",
            `top-level nodes after app must be pages, found "${node.type}"`,
            typeCol,
            node.type.length,
            "indent it under a page",
          );
        }
      }
    } else {
      const parent = stack[level - 1]!.node;
      if (parent?.type === "app") {
        report(
          "E_BAD_INDENT",
          "pages are written at the top level, not indented under app",
          1,
          idx,
          "remove the indentation",
        );
      } else if (parent && node) parent.children.push(node);
    }
    stack.push({ node });
  }

  if (rootCount === 0) {
    diagnostics.push({
      code: "E_EMPTY",
      message: "empty spec",
      line: 1,
      column: 1,
      length: 1,
      hint: 'start with: app "My App"',
    });
  }

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
  return { ...(app ? { app } : {}), diagnostics };
}
