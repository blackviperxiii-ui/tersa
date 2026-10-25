import type {
  ActionNode,
  AppNode,
  ButtonNode,
  CardNode,
  ChartNode,
  CtaNode,
  FeaturesNode,
  FormNode,
  GridNode,
  HeroNode,
  KpiNode,
  Node,
  PageNode,
  RowNode,
  TableNode,
  TextNode,
} from "@tersa/spec";
import { withGeneratedBanner } from "./slots";
import { literal } from "./mock";

export interface Emitted {
  jsx: string;
  /** Component names from @/components/tersa/* that the page needs. */
  imports: Set<string>;
  /** Data export names the page needs from @/lib/data. */
  data: Set<string>;
}

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

const KPI_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-3 xl:grid-cols-6",
};

const indent = (s: string, n = 1) =>
  s
    .split("\n")
    .map((l) => (l ? "  ".repeat(n) + l : l))
    .join("\n");

const attr = (k: string, v: string | undefined) => (v === undefined ? "" : ` ${k}=${literal(v)}`);
const idAttr = (n: Node) => (n.id ? ` id=${literal(n.id)}` : "");

/** `@user.revenue` -> `user.revenue` with safe property access for odd keys. */
function accessPath(bind: string) {
  const [root, ...rest] = bind.split(".");
  return rest.reduce(
    (acc, k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? `${acc}.${k}` : `${acc}[${literal(k)}]`),
    root!,
  );
}

class Renderer {
  imports = new Set<string>();
  data = new Set<string>();

  node(n: Node): string {
    switch (n.type) {
      case "row":
        return this.row(n);
      case "grid":
        return this.grid(n);
      case "card":
        return this.card(n);
      case "hero":
        return this.hero(n);
      case "features":
        return this.features(n);
      case "cta":
        return this.cta(n);
      case "kpi":
        return this.kpi(n);
      case "chart":
        return this.chart(n);
      case "table":
        return this.table(n);
      case "form":
        return this.form(n);
      case "button":
        return this.button(n);
      case "text":
        return this.text(n);
      case "action":
        return `{/* action "${n.label}" must sit under a table */}`;
      case "app":
      case "page":
        return "";
    }
  }

  children(n: Node): string {
    return n.children.map((c) => this.node(c)).join("\n");
  }

  row(n: RowNode): string {
    if (n.repeat && n.bind) {
      this.imports.add("KpiRow");
      this.data.add(n.bind);
      return `<KpiRow${idAttr(n)} items={${n.bind}} className=${literal(KPI_COLS[Math.min(6, n.repeat.count)]!)} />`;
    }
    if (n.children.length === 0) return `<div${idAttr(n)} className="flex flex-wrap gap-4" />`;
    return `<div${idAttr(n)} className="flex flex-wrap items-start gap-4">\n${indent(this.children(n))}\n</div>`;
  }

  grid(n: GridNode): string {
    const cls = COLS[n.cols] ?? COLS[2]!;
    if (n.children.length === 0)
      return `<div${idAttr(n)} className=${literal(`grid gap-4 ${cls}`)} />`;
    return `<div${idAttr(n)} className=${literal(`grid gap-4 ${cls}`)}>\n${indent(this.children(n))}\n</div>`;
  }

  landingActions(n: HeroNode | CtaNode): string {
    const parts = n.children
      .map((c) => this.node(c))
      .filter(Boolean)
      .join("\n");
    return parts ? ` actions={<>\n${indent(parts, 2)}\n    </>}` : "";
  }

  hero(n: HeroNode): string {
    this.imports.add("HeroSection");
    return `<HeroSection${idAttr(n)} title=${literal(n.title)}${attr("subtitle", n.subtitle)} align=${literal(n.align)}${this.landingActions(n)} />`;
  }

  features(n: FeaturesNode): string {
    this.imports.add("FeaturesSection");
    this.data.add(n.bind);
    return `<FeaturesSection${idAttr(n)}${attr("title", n.title)} items={${n.bind}} cols={${n.cols}} />`;
  }

  cta(n: CtaNode): string {
    this.imports.add("CtaSection");
    return `<CtaSection${idAttr(n)} title=${literal(n.title)}${attr("subtitle", n.subtitle)}${this.landingActions(n)} />`;
  }

  card(n: CardNode): string {
    this.imports.add("Card");
    const head = n.title
      ? `\n  <CardHeader>\n    <CardTitle>${escapeText(n.title)}</CardTitle>\n  </CardHeader>`
      : "";
    if (n.title) {
      this.imports.add("CardHeader");
      this.imports.add("CardTitle");
    }
    const body = n.children.length
      ? `\n  <CardContent className="space-y-4">\n${indent(this.children(n), 2)}\n  </CardContent>`
      : "";
    if (n.children.length) this.imports.add("CardContent");
    return `<Card${idAttr(n)}>${head}${body}\n</Card>`;
  }

  kpi(n: KpiNode): string {
    this.imports.add("KpiCard");
    this.data.add(n.bind.split(".")[0]!);
    const label = n.label ?? humanize(n.bind.split(".").pop()!);
    return `<KpiCard${idAttr(n)} item={{ label: ${literal(label)}, value: ${accessPath(n.bind)}, format: ${literal(n.format)} }} />`;
  }

  chart(n: ChartNode): string {
    this.imports.add("ChartCard");
    this.data.add(n.bind);
    return `<ChartCard${idAttr(n)} kind=${literal(n.kind)} data={${n.bind}} x=${literal(n.x)} y=${literal(n.y)}${attr("title", n.title)} />`;
  }

  table(n: TableNode): string {
    this.imports.add("DataTable");
    this.data.add(n.bind);
    const cols = n.cols
      .map((c) => `{ key: ${literal(c.key)}, type: ${literal(c.type)} }`)
      .join(", ");
    const actions = n.children.filter((c): c is ActionNode => c.type === "action");
    const actionsAttr = actions.length
      ? `\n  actions={[\n${actions
          .map(
            (a) =>
              `    { label: ${literal(a.label)}, variant: ${literal(a.variant)}, fn: ${literal(
                a.action.kind === "api" ? a.action.fn : "",
              )}, args: ${literal(a.action.kind === "api" ? a.action.args : [])}, confirm: ${a.confirm} },`,
          )
          .join("\n")}\n  ]}`
      : "";
    const flags = `${n.sort ? "\n  sort" : ""}${n.search ? "\n  search" : ""}`;
    return `<DataTable${idAttr(n)}${n.title ? `\n  title=${literal(n.title)}` : ""}\n  data={${n.bind}}\n  cols={[${cols}]}${flags}\n  pageSize={${n.pageSize}}${actionsAttr}\n/>`;
  }

  form(n: FormNode): string {
    this.imports.add("FormView");
    if (n.bind) this.data.add(n.bind);
    const fields = n.fields
      .map(
        (f) =>
          `    { name: ${literal(f.name)}, type: ${literal(f.type)}${f.options ? `, options: ${literal(f.options)}` : ""} },`,
      )
      .join("\n");
    const fn = n.action.kind === "api" ? n.action.fn : "submit";
    return `<FormView${idAttr(n)}${n.title ? `\n  title=${literal(n.title)}` : ""}\n  fields={[\n${fields}\n  ]}${
      n.bind ? `\n  initial={${n.bind}}` : ""
    }\n  fn=${literal(fn)}\n  submitLabel=${literal(n.submitLabel)}\n/>`;
  }

  button(n: ButtonNode): string {
    this.imports.add("ActionButton");
    const target =
      n.action?.kind === "api"
        ? ` fn=${literal(n.action.fn)}`
        : n.action?.kind === "nav"
          ? ` to=${literal(n.action.to)}`
          : "";
    return `<ActionButton${idAttr(n)} label=${literal(n.label)} variant=${literal(n.variant)}${target} />`;
  }

  text(n: TextNode): string {
    const cls =
      n.variant === "heading"
        ? "text-xl font-semibold tracking-tight"
        : n.variant === "muted"
          ? "text-sm text-muted-foreground"
          : "text-sm leading-6";
    const tag = n.variant === "heading" ? "h2" : "p";
    return `<${tag}${idAttr(n)} className=${literal(cls)}>${escapeText(n.text)}</${tag}>`;
  }
}

function humanize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Text inside JSX: escape braces and angle brackets via a JS string when needed. */
function escapeText(text: string) {
  return /[{}<>]|^\s|\s$|\n/.test(text) ? `{${literal(text)}}` : text;
}

export function renderPage(page: PageNode): Emitted {
  const r = new Renderer();
  const body = page.children.map((c) => r.node(c)).join("\n");
  return { jsx: body, imports: r.imports, data: r.data };
}

const UI_IMPORTS = new Set(["Card", "CardHeader", "CardTitle", "CardContent"]);
const TERSA_FILES: Record<string, string> = {
  KpiRow: "kpi-card",
  KpiCard: "kpi-card",
  ChartCard: "chart-card",
  DataTable: "data-table",
  FormView: "form-view",
  ActionButton: "action-button",
  HeroSection: "hero-section",
  FeaturesSection: "features-section",
  CtaSection: "cta-section",
};

export function importLines(imports: Set<string>, data: Set<string>): string[] {
  const lines: string[] = [];
  const byFile = new Map<string, string[]>();
  for (const name of [...imports].sort()) {
    const file = UI_IMPORTS.has(name)
      ? "@/components/ui/card"
      : `@/components/tersa/${TERSA_FILES[name]}`;
    byFile.set(file, [...(byFile.get(file) ?? []), name]);
  }
  for (const [file, names] of [...byFile.entries()].sort())
    lines.push(`import { ${names.join(", ")} } from "${file}";`);
  if (data.size) lines.push(`import { ${[...data].sort().join(", ")} } from "@/lib/data";`);
  return lines;
}

export function pageSource(page: PageNode): string {
  const { jsx, imports, data } = renderPage(page);
  const lines = importLines(imports, data);
  const body = jsx
    ? indent(jsx, 3)
    : `      <p className="text-sm text-muted-foreground">Nothing here yet.</p>`;
  return `${withGeneratedBanner(`${lines.join("\n")}${lines.length ? "\n\n" : ""}export const metadata = { title: ${literal(page.title)} };

export default function Page() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">${escapeText(page.title)}</h1>
${body}
    </section>
  );
}
`)}`;
}

/** A loading skeleton that mirrors the page's layout. */
export function loadingSource(page: PageNode): string {
  const block = (n: Node): string => {
    switch (n.type) {
      case "row":
        return n.repeat
          ? `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 ${KPI_COLS[Math.min(6, n.repeat.count)]}">\n${indent(
              Array.from({ length: n.repeat.count }, () => `<Skeleton className="h-24" />`).join(
                "\n",
              ),
            )}\n</div>`
          : n.children.map(block).join("\n");
      case "grid":
        return `<div className="grid gap-4 ${COLS[n.cols] ?? COLS[2]}">\n${indent(n.children.map(block).join("\n"))}\n</div>`;
      case "card":
        return `<Skeleton className="h-40" />`;
      case "hero":
        return `<Skeleton className="h-48 w-full" />`;
      case "features":
        return `<div className="grid gap-4 sm:grid-cols-3">\n${indent(
          Array.from({ length: 3 }, () => `<Skeleton className="h-32" />`).join("\n"),
        )}\n</div>`;
      case "cta":
        return `<Skeleton className="h-28 w-full" />`;
      case "kpi":
        return `<Skeleton className="h-24" />`;
      case "chart":
        return `<Skeleton className="h-72" />`;
      case "table":
        return `<Skeleton className="h-96" />`;
      case "form":
        return `<Skeleton className="h-64" />`;
      case "button":
        return `<Skeleton className="h-9 w-24" />`;
      case "text":
        return `<Skeleton className="h-4 w-2/3" />`;
      default:
        return "";
    }
  };
  const body = page.children.map(block).filter(Boolean).join("\n");
  return `${withGeneratedBanner(`import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
${indent(body || `<Skeleton className="h-40" />`, 3)}
    </section>
  );
}
`)}`;
}

export function layoutSource(app: AppNode): string {
  const pages = app.children
    .filter((c): c is PageNode => c.type === "page")
    .map((p) => `    { path: ${literal(p.path)}, title: ${literal(p.title)} },`)
    .join("\n");
  return `${withGeneratedBanner(`import type { Metadata } from "next";
import { AppShell } from "@/components/tersa/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: ${literal(app.name)}, template: ${literal(`%s · ${app.name}`)} },
};

const pages = [
${pages}
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"${app.dark ? ' className="dark"' : ""}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppShell appName=${literal(app.name)} nav=${literal(app.nav)} pages={pages}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
`)}`;
}

export function rootPageSource(app: AppNode): string {
  const first = app.children.find((c): c is PageNode => c.type === "page");
  if (!first || first.path === "/") return "";
  return `${withGeneratedBanner(`import { redirect } from "next/navigation";

export default function Home() {
  redirect(${literal(first.path)});
}
`)}`;
}

export function globalsCss(themeCss: string): string {
  return `@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

${themeCss}
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    font-family: var(--font-body);
  }
}
`;
}
