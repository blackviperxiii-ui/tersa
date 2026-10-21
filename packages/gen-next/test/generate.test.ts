import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compile } from "@tersa/spec";
import { generate, planData, slugify } from "../src";

const example = readFileSync(
  new URL("../../../examples/dashboard/app.tsa", import.meta.url),
  "utf8",
);
const app = compile(example);
const files = generate(app);
const file = (p: string) => {
  const f = files.find((x) => x.path === p);
  if (!f)
    throw new Error(`missing generated file ${p}; have ${files.map((x) => x.path).join(", ")}`);
  return f.content;
};

/** Files whose content depends on the spec. Static templates are covered by the integration test. */
const DYNAMIC = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/dashboard/page.tsx",
  "app/dashboard/loading.tsx",
  "app/settings/page.tsx",
  "app/settings/loading.tsx",
  "lib/data.ts",
  "lib/api.ts",
  "package.json",
  "README.md",
];

describe("generate(dashboard example)", () => {
  it("emits a complete, sorted file set", () => {
    expect(files.map((f) => f.path)).toMatchSnapshot();
    expect(files.map((f) => f.path)).toEqual([...files.map((f) => f.path)].sort());
    expect(new Set(files.map((f) => f.path)).size).toBe(files.length);
  });

  it.each(DYNAMIC)("%s matches snapshot", (p) => {
    expect(file(p)).toMatchSnapshot();
  });

  it("is deterministic", () => {
    expect(generate(app)).toEqual(files);
  });

  it("uses only design tokens: no raw hex anywhere", () => {
    for (const f of files) {
      expect(f.content, f.path).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it("wires the dark theme and sidebar nav into the layout", () => {
    const layout = file("app/layout.tsx");
    expect(layout).toContain('<html lang="en" className="dark">');
    expect(layout).toContain('nav="sidebar"');
    expect(layout).toContain('{ path: "/dashboard", title: "Overview" }');
    expect(layout).toContain('{ path: "/settings", title: "Settings" }');
  });

  it("redirects / to the first page", () => {
    expect(file("app/page.tsx")).toContain('redirect("/dashboard")');
  });

  it("renders every node of the dashboard page", () => {
    const page = file("app/dashboard/page.tsx");
    expect(page).toContain("<KpiRow items={metrics}");
    expect(page).toContain('kind="line" data={revenue} x="month" y="total" title="Revenue"');
    expect(page).toContain('kind="bar" data={signups} x="week" y="value" title="Signups"');
    expect(page).toContain("data={orders}");
    expect(page).toContain('{ key: "total", type: "money" }');
    expect(page).toContain('{ key: "status", type: "badge" }');
    expect(page).toMatch(/\n\s+sort\n\s+search\n/);
    expect(page).toContain("pageSize={20}");
    expect(page).toContain(
      '{ label: "Refund", variant: "destructive", fn: "refund", args: ["id"], confirm: true }',
    );
    expect(page).toContain('import { metrics, orders, revenue, signups } from "@/lib/data";');
  });

  it("renders the settings form with typed fields and initial values", () => {
    const page = file("app/settings/page.tsx");
    expect(page).toContain('{ name: "email", type: "email" }');
    expect(page).toContain('{ name: "plan", type: "select", options: ["free", "pro"] }');
    expect(page).toContain("initial={user}");
    expect(page).toContain('fn="saveUser"');
  });

  it("generates mock data for every binding with matching columns", () => {
    const data = file("lib/data.ts");
    expect(data).toContain("export const metrics: KpiItem[]");
    expect((data.match(/kpi\(\{/g) ?? []).length).toBe(4);
    expect(data).toMatch(/export const revenue: Row\[\] = \[\n {2}\{ month: "Jan", total: \d+ \},/);
    expect(data).toMatch(/export const signups: Row\[\] = \[\n {2}\{ week: "W1", value: \d+ \},/);
    expect(data).toMatch(
      /export const orders: Row\[\] = \[\n {2}\{ id: "rec_1000", customer: "[^"]+", total: \d+, status: "[a-z]+" \},/,
    );
    expect(data).toMatch(
      /export const user = \{\n {2}name: "[^"]+",\n {2}email: "[^"]+@example\.com",\n {2}plan: "free",\n\};/,
    );
  });

  it("stubs every api function the spec references", () => {
    const api = file("lib/api.ts");
    expect(api).toContain("async refund(id: unknown)");
    expect(api).toContain("async saveUser(values: Record<string, unknown>)");
  });

  it("emits loading skeletons that mirror the layout", () => {
    const loading = file("app/dashboard/loading.tsx");
    expect((loading.match(/<Skeleton className="h-24" \/>/g) ?? []).length).toBe(4);
    expect(loading).toContain('<Skeleton className="h-72" />');
    expect(loading).toContain('<Skeleton className="h-96" />');
  });

  it("includes the theme variables and tailwind mapping in globals.css", () => {
    const css = file("app/globals.css");
    expect(css).toContain('@import "tailwindcss";');
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    expect(css).toContain("@theme inline {");
    expect(css).toContain("--color-primary: var(--primary);");
  });
});

describe("generate: other shapes", () => {
  it("handles a root page, top nav, light theme, cards, buttons and text", () => {
    const src = [
      'app "Mini" nav=top',
      'page / "Home"',
      '  card "Welcome"',
      '    text "Hello {world}" ~heading',
      '    text "Plain copy"',
      '    button "Go" ~outline -> /about',
      '    button "Ping" -> api.ping',
      'page /about "About"',
      '  kpi @stats.total "Total" format=money',
      "  kpi @count",
    ].join("\n");
    const out = generate(compile(src));
    const paths = out.map((f) => f.path);
    expect(paths).toContain("app/page.tsx");
    expect(paths).toContain("app/loading.tsx");
    expect(paths).toContain("app/about/page.tsx");
    const home = out.find((f) => f.path === "app/page.tsx")!.content;
    expect(home).not.toContain("redirect(");
    expect(home).toContain(
      '<h2 className="text-xl font-semibold tracking-tight">{"Hello {world}"}</h2>',
    );
    expect(home).toContain('<ActionButton label="Go" variant="outline" to="/about" />');
    expect(home).toContain('<ActionButton label="Ping" variant="default" fn="ping" />');
    expect(home).toContain(
      'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
    );
    const layout = out.find((f) => f.path === "app/layout.tsx")!.content;
    expect(layout).toContain('<html lang="en">');
    expect(layout).toContain('nav="top"');
    const about = out.find((f) => f.path === "app/about/page.tsx")!.content;
    expect(about).toContain('item={{ label: "Total", value: stats.total, format: "money" }}');
    expect(about).toContain('item={{ label: "Count", value: count, format: "number" }}');
    const data = out.find((f) => f.path === "lib/data.ts")!.content;
    expect(data).toContain("export const stats = {\n  total: 128400,\n};");
    expect(data).toContain("export const count = 1289;");
    const api = out.find((f) => f.path === "lib/api.ts")!.content;
    expect(api).toContain("async ping()");
  });

  it("shares one list between a chart and a table", () => {
    const src =
      'app "X"\npage /a "A"\n  chart line @sales x=month y=total\n  table @sales cols=month,total:money,region';
    const data = generate(compile(src)).find((f) => f.path === "lib/data.ts")!.content;
    expect(data).toMatch(
      /export const sales: Row\[\] = \[\n {2}\{ month: "Jan", total: \d+, region: "[^"]+" \},/,
    );
    expect(planData(compile(src)).lists[0]!.uses).toHaveLength(2);
  });

  it("slugifies package names", () => {
    expect(slugify("Acme Ops")).toBe("acme-ops");
    expect(slugify("  !!  ")).toBe("tersa-app");
  });
});
