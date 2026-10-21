import type {
  AppNode,
  ChartNode,
  FieldDef,
  FormNode,
  KpiNode,
  Node,
  RowNode,
  TableNode,
} from "@tersa/spec";

/** Deterministic PRNG so generated mock data is stable across runs (snapshot-friendly). */
export function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export type ListUse =
  | { kind: "kpis"; count: number; node: RowNode }
  | { kind: "chart"; node: ChartNode }
  | { kind: "table"; node: TableNode };

export interface ListBinding {
  name: string;
  uses: ListUse[];
}
export interface RecordBinding {
  name: string;
  form?: FormNode;
  kpis: KpiNode[];
}
export interface ItemBinding {
  name: string;
  kpi: KpiNode;
}

export interface DataPlan {
  lists: ListBinding[];
  records: RecordBinding[];
  items: ItemBinding[];
  apiFns: Map<string, { kind: "row" | "form" | "button"; args: string[] }>;
}

function* walk(node: Node): Generator<Node> {
  yield node;
  for (const c of node.children) yield* walk(c);
}

/** Collects every data binding and api function the app references. */
export function planData(app: AppNode): DataPlan {
  const lists = new Map<string, ListBinding>();
  const records = new Map<string, RecordBinding>();
  const items: ItemBinding[] = [];
  const apiFns: DataPlan["apiFns"] = new Map();

  const list = (name: string) => {
    let l = lists.get(name);
    if (!l) lists.set(name, (l = { name, uses: [] }));
    return l;
  };
  const record = (name: string) => {
    let r = records.get(name);
    if (!r) records.set(name, (r = { name, kpis: [] }));
    return r;
  };

  for (const node of walk(app)) {
    switch (node.type) {
      case "row":
        if (node.repeat && node.bind) {
          list(node.bind).uses.push({ kind: "kpis", count: node.repeat.count, node });
        }
        break;
      case "chart":
        list(node.bind).uses.push({ kind: "chart", node });
        break;
      case "table":
        list(node.bind).uses.push({ kind: "table", node });
        for (const c of node.children) {
          if (c.type === "action" && c.action.kind === "api") {
            apiFns.set(c.action.fn, { kind: "row", args: c.action.args });
          }
        }
        break;
      case "form":
        if (node.bind) record(node.bind).form = node;
        if (node.action.kind === "api") apiFns.set(node.action.fn, { kind: "form", args: [] });
        break;
      case "kpi":
        if (node.bind.includes(".")) record(node.bind.split(".")[0]!).kpis.push(node);
        else items.push({ name: node.bind, kpi: node });
        break;
      case "button":
        if (node.action?.kind === "api") apiFns.set(node.action.fn, { kind: "button", args: [] });
        break;
      default:
        break;
    }
  }
  return { lists: [...lists.values()], records: [...records.values()], items, apiFns };
}

// ---------------------------------------------------------------------------
// value generators

const FIRST = [
  "Ava",
  "Liam",
  "Noah",
  "Mia",
  "Zoe",
  "Eli",
  "Ivy",
  "Max",
  "Leo",
  "Uma",
  "Kai",
  "Nia",
];
const LAST = [
  "Patel",
  "Chen",
  "Garcia",
  "Okafor",
  "Novak",
  "Silva",
  "Haddad",
  "Kim",
  "Reyes",
  "Berg",
];
const WORDS = [
  "atlas",
  "beacon",
  "cobalt",
  "delta",
  "ember",
  "falcon",
  "granite",
  "harbor",
  "iris",
  "juniper",
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUSES = ["paid", "pending", "paid", "failed", "paid", "refunded"];

export const literal = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map((x) => literal(x)).join(", ")}]` : JSON.stringify(v);

function humanize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Guess a sensible value for a key name. Returns a JS literal string. */
export function mockValue(key: string, next: () => number, index: number, type?: string): string {
  const k = key.toLowerCase();
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]!;
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));

  if (type === "money" || /(total|amount|price|revenue|mrr|arr|cost)/.test(k))
    return String(int(12, 480) * 5);
  if (type === "number" || /(count|qty|quantity|signups|users|visits|orders)$/.test(k))
    return String(int(5, 900));
  if (type === "badge" || /(status|state|plan|tier)/.test(k)) return literal(pick(STATUSES));
  if (type === "date" || /(date|created|updated|at)$/.test(k)) {
    const d = new Date(Date.UTC(2026, 0, 1 + index * 3 + int(0, 2)));
    return literal(d.toISOString().slice(0, 10));
  }
  if (type === "email" || /email/.test(k)) {
    const f = pick(FIRST).toLowerCase();
    return literal(`${f}.${pick(LAST).toLowerCase()}@example.com`);
  }
  if (/^id$|_id$|id$/.test(k)) return literal(`${k.replace(/_?id$/, "") || "rec"}_${1000 + index}`);
  if (/(customer|name|user|owner|author)/.test(k)) return literal(`${pick(FIRST)} ${pick(LAST)}`);
  if (/month/.test(k)) return literal(MONTHS[index % 12]!);
  if (/week/.test(k)) return literal(`W${index + 1}`);
  if (/(day|date)/.test(k)) return literal(`Day ${index + 1}`);
  if (/(title|product|project|team)/.test(k)) return literal(humanize(pick(WORDS)));
  if (/(value|score|rate|pct|percent)/.test(k)) return String(int(10, 95));
  return literal(`${humanize(key)} ${index + 1}`);
}

/** Field value for a record (form initial values). */
export function mockField(field: FieldDef, next: () => number): string {
  if (field.type === "select") return literal(field.options?.[0] ?? "");
  if (field.type === "checkbox") return "true";
  if (field.type === "number") return mockValue(field.name, next, 0, "number");
  if (field.type === "email") return mockValue(field.name, next, 0, "email");
  if (field.type === "textarea") return literal("Short description goes here.");
  return mockValue(field.name, next, 0);
}

const KPI_LABELS = [
  "Revenue",
  "Active users",
  "Conversion",
  "Churn",
  "Orders",
  "Avg. order",
  "Sessions",
  "NPS",
];
const KPI_FORMATS = [
  "money",
  "number",
  "percent",
  "percent",
  "number",
  "money",
  "number",
  "number",
];

/** Builds the JS source for a list binding, merging every use's column needs. */
export function listSource(binding: ListBinding, length: number): string {
  const next = rng(binding.name);
  const kpis = binding.uses.find((u) => u.kind === "kpis");
  if (kpis) {
    const n = kpis.count;
    const items = Array.from({ length: n }, (_, i) => {
      const label = KPI_LABELS[i % KPI_LABELS.length]!;
      const format = KPI_FORMATS[i % KPI_FORMATS.length]!;
      const value =
        format === "money"
          ? (40 + Math.floor(next() * 400)) * 100
          : format === "percent"
            ? Math.round(next() * 400) / 10 + 1
            : 100 + Math.floor(next() * 9000);
      const delta = Math.round((next() * 30 - 10) * 10) / 10;
      return `  kpi({ label: ${literal(label)}, value: ${value}, format: ${literal(format)}, delta: ${delta} }),`;
    });
    return `export const ${binding.name}: KpiItem[] = [\n${items.join("\n")}\n];`;
  }

  const columns = new Map<string, string | undefined>();
  for (const use of binding.uses) {
    if (use.kind === "chart") {
      columns.set(use.node.x, "label");
      if (!columns.has(use.node.y)) columns.set(use.node.y, "number");
    } else if (use.kind === "table") {
      for (const c of use.node.cols) columns.set(c.key, c.type === "text" ? undefined : c.type);
    }
  }
  const rows = Array.from({ length }, (_, i) => {
    const cells = [...columns.entries()].map(([key, type]) => {
      const v = type === "label" ? mockValue(key, next, i) : mockValue(key, next, i, type);
      return `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : literal(key)}: ${v}`;
    });
    return `  { ${cells.join(", ")} },`;
  });
  return `export const ${binding.name}: Row[] = [\n${rows.join("\n")}\n];`;
}

export function recordSource(binding: RecordBinding): string {
  const next = rng(binding.name);
  const fields = new Map<string, string>();
  let person: string | undefined;
  if (binding.form) {
    for (const f of binding.form.fields) {
      let v = mockField(f, next);
      if (f.type !== "select" && f.type !== "checkbox" && /(name|user|owner)/i.test(f.name)) {
        person = JSON.parse(v) as string;
      }
      if (f.type === "email" && person) {
        v = literal(`${person.toLowerCase().replace(/\s+/g, ".")}@example.com`);
      }
      fields.set(f.name, v);
    }
  }
  for (const k of binding.kpis) {
    const key = k.bind.split(".").slice(1).join(".");
    if (!fields.has(key)) {
      const v = k.format === "money" ? "128400" : k.format === "percent" ? "4.2" : "1289";
      fields.set(key, v);
    }
  }
  const entries = [...fields.entries()].map(
    ([k, v]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : literal(k)}: ${v},`,
  );
  return `export const ${binding.name} = {\n${entries.join("\n")}\n};`;
}

export function itemSource(binding: ItemBinding): string {
  const f = binding.kpi.format;
  const v = f === "money" ? "128400" : f === "percent" ? "4.2" : "1289";
  return `export const ${binding.name} = ${v};`;
}

/** Suggests a length for a list from how it is used. */
export function listLength(binding: ListBinding): number {
  let n = 0;
  for (const use of binding.uses) {
    if (use.kind === "chart") n = Math.max(n, use.node.x === "month" ? 12 : 8);
    if (use.kind === "table") n = Math.max(n, Math.min(60, use.node.pageSize * 2 + 3));
  }
  return n || 8;
}
