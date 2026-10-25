import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse, type Diagnostic, type Node } from "../src";

const example = readFileSync(
  new URL("../../../examples/dashboard/app.tsa", import.meta.url),
  "utf8",
);

/** First diagnostic, with a readable failure when there is none. */
function firstError(source: string): Diagnostic {
  const { diagnostics } = parse(source);
  expect(diagnostics.length, `expected an error for:\n${source}`).toBeGreaterThan(0);
  return diagnostics[0]!;
}

function child(node: Node, i: number): Node {
  const c = node.children[i];
  if (!c) throw new Error(`no child ${i} on ${node.type}`);
  return c;
}

describe("parse: valid specs", () => {
  it("parses the dashboard example into the expected tree", () => {
    const { app, diagnostics } = parse(example);
    expect(diagnostics).toEqual([]);
    expect(app).toBeDefined();
    expect(app).toMatchObject({
      type: "app",
      name: "Acme Ops",
      theme: "aurora",
      dark: true,
      nav: "sidebar",
    });
    const [dashboard, settings] = app!.children;
    expect(dashboard).toMatchObject({ type: "page", path: "/dashboard", title: "Overview" });
    expect(settings).toMatchObject({ type: "page", path: "/settings", title: "Settings" });

    const row = child(dashboard!, 0);
    expect(row).toMatchObject({ type: "row", repeat: { of: "kpi", count: 4 }, bind: "metrics" });

    const grid = child(dashboard!, 1);
    expect(grid).toMatchObject({ type: "grid", cols: 2 });
    expect(child(grid, 0)).toMatchObject({
      type: "chart",
      kind: "line",
      bind: "revenue",
      x: "month",
      y: "total",
      title: "Revenue",
    });
    expect(child(grid, 1)).toMatchObject({ type: "chart", kind: "bar", x: "week", y: "value" });

    const table = child(dashboard!, 2);
    expect(table).toMatchObject({
      type: "table",
      bind: "orders",
      sort: true,
      search: true,
      pageSize: 20,
      cols: [
        { key: "id", type: "text" },
        { key: "customer", type: "text" },
        { key: "total", type: "money" },
        { key: "status", type: "badge" },
      ],
    });
    expect(child(table, 0)).toMatchObject({
      type: "action",
      label: "Refund",
      variant: "destructive",
      confirm: true,
      action: { kind: "api", fn: "refund", args: ["id"] },
    });

    expect(child(settings!, 0)).toMatchObject({
      type: "form",
      bind: "user",
      submitLabel: "Save",
      action: { kind: "api", fn: "saveUser", args: [] },
      fields: [
        { name: "name", type: "text" },
        { name: "email", type: "email" },
        { name: "plan", type: "select", options: ["free", "pro"] },
      ],
    });
  });

  it("applies defaults on app", () => {
    const { app } = parse('app "Mini"\npage /a "A"\n  text "hi"');
    expect(app).toMatchObject({ theme: "aurora", dark: false, nav: "sidebar" });
  });

  it("ignores blank lines, comments and CRLF line endings", () => {
    const src =
      'app "X"\r\n\r\n# a comment\r\npage /a "A"\r\n  # nested comment\r\n  text "hi"\r\n';
    const { app, diagnostics } = parse(src);
    expect(diagnostics).toEqual([]);
    expect(child(child(app!, 0), 0)).toMatchObject({ type: "text", text: "hi" });
  });

  it("supports trailing comments but not at the cost of #ids", () => {
    const src = [
      'app "X"',
      'page /a "A"',
      "  row kpi*4 @metrics   # label,value,delta per item",
      '  text "a # b" #note',
    ].join("\n");
    const { app, diagnostics } = parse(src);
    expect(diagnostics).toEqual([]);
    const page = child(app!, 0);
    expect(child(page, 0)).toMatchObject({ type: "row", bind: "metrics" });
    expect(child(page, 1)).toMatchObject({ type: "text", text: "a # b", id: "note" });
  });

  it("reads ids, variants, quoted prop values and escapes", () => {
    const src = [
      'app "X"',
      'page / "Home"',
      '  button "Say \\"hi\\"" #hello ~outline -> /settings',
      '  form fields=a submit="Save changes" -> api.go "Profile"',
      '  text "Muted" ~muted',
    ].join("\n");
    const { app, diagnostics } = parse(src);
    expect(diagnostics).toEqual([]);
    const page = child(app!, 0);
    expect(child(page, 0)).toMatchObject({
      type: "button",
      label: 'Say "hi"',
      id: "hello",
      variant: "outline",
      action: { kind: "nav", to: "/settings" },
    });
    expect(child(page, 1)).toMatchObject({
      type: "form",
      submitLabel: "Save changes",
      title: "Profile",
    });
    expect(child(page, 2)).toMatchObject({ type: "text", variant: "muted" });
  });

  it("parses api actions with several arguments", () => {
    const src = 'app "X"\npage /a "A"\n  table @t cols=a\n    action "Go" -> api.move(id,target)';
    const { app, diagnostics } = parse(src);
    expect(diagnostics).toEqual([]);
    expect(child(child(child(app!, 0), 0), 0)).toMatchObject({
      action: { kind: "api", fn: "move", args: ["id", "target"] },
    });
  });

  it("records 1-based locations of nodes", () => {
    const { app } = parse(example);
    const table = child(child(app!, 0), 2);
    expect(table.loc).toEqual({ line: 7, column: 3 });
  });
});

describe("parse: invalid specs report line and column", () => {
  it("rejects an empty spec", () => {
    expect(firstError("")).toMatchObject({ code: "E_EMPTY", line: 1, column: 1 });
    expect(firstError("# only a comment\n")).toMatchObject({ code: "E_EMPTY" });
  });

  it("requires app as the first node", () => {
    expect(firstError('page /a "A"')).toMatchObject({ code: "E_EXPECTED_APP", line: 1, column: 1 });
  });

  it("allows only one app line", () => {
    const d = firstError('app "X"\npage /a "A"\napp "Y"');
    expect(d).toMatchObject({ code: "E_MULTIPLE_APP", line: 3, column: 1 });
  });

  it("allows only pages at the top level after app", () => {
    const d = firstError('app "X"\ncard "C"');
    expect(d).toMatchObject({ code: "E_EXPECTED_PAGE", line: 2, column: 1 });
  });

  it("rejects pages indented under app", () => {
    const d = firstError('app "X"\n  page /a "A"');
    expect(d).toMatchObject({ code: "E_BAD_INDENT", line: 2 });
    expect(d.message).toContain("top level");
  });

  it("suggests a close node type for typos", () => {
    const d = firstError('app "X"\npage /a "A"\n  tabel @orders cols=id');
    expect(d).toMatchObject({ code: "E_UNKNOWN_NODE", line: 3, column: 3, length: 5 });
    expect(d.hint).toContain('"table"');
  });

  it("rejects lines that do not start with a node type", () => {
    expect(firstError('app "X"\n@metrics')).toMatchObject({
      code: "E_EXPECTED_NODE",
      line: 2,
      column: 1,
    });
  });

  it("rejects tab indentation", () => {
    expect(firstError('app "X"\n\tpage /a "A"')).toMatchObject({
      code: "E_TAB_INDENT",
      line: 2,
      column: 1,
    });
  });

  it("rejects odd indentation", () => {
    const d = firstError('app "X"\n page /a "A"');
    expect(d).toMatchObject({ code: "E_BAD_INDENT", line: 2, column: 1 });
    expect(d.message).toContain("multiple of 2");
  });

  it("rejects indentation that jumps more than one level", () => {
    const d = firstError('app "X"\n    page /a "A"');
    expect(d).toMatchObject({ code: "E_BAD_INDENT", line: 2, column: 1 });
    expect(d.message).toContain("jumps");
  });

  it("reports unterminated strings at the opening quote", () => {
    expect(firstError('app "X\npage /a "A"')).toMatchObject({
      code: "E_UNTERMINATED_STRING",
      line: 1,
      column: 5,
    });
  });

  it("reports unknown props with a suggestion and exact column", () => {
    const d = firstError('app "X"\npage /a "A"\n  table @t colz=id');
    expect(d).toMatchObject({ code: "E_UNKNOWN_PROP", line: 3, column: 12, length: 4 });
    expect(d.hint).toContain('"cols"');
  });

  it("reports unexpected bare words", () => {
    const d = firstError('app "X"\npage /a "A"\n  table @t cols=id sorted');
    expect(d).toMatchObject({ code: "E_UNEXPECTED_ARG", line: 3, column: 20 });
    expect(d.hint).toContain('"sort"');
  });

  it("reports missing required pieces at the node type", () => {
    expect(firstError('app "X"\npage /a')).toMatchObject({
      code: "E_MISSING_TEXT",
      line: 2,
      column: 1,
    });
    expect(firstError('app "X"\npage /a "A"\n  chart line @d x=a\n  chart line x=a')).toMatchObject(
      {
        code: "E_MISSING_BIND",
        line: 4,
      },
    );
    expect(firstError('app "X"\npage /a "A"\n  table @t')).toMatchObject({
      code: "E_MISSING_PROP",
      line: 3,
    });
    expect(firstError('app "X"\npage /a "A"\n  grid')).toMatchObject({
      code: "E_MISSING_ARG",
      line: 3,
    });
    expect(firstError('app "X"\npage /a "A"\n  form fields=a')).toMatchObject({
      code: "E_MISSING_ACTION",
      line: 3,
    });
  });

  it("rejects page paths that do not start with a slash", () => {
    expect(firstError('app "X"\npage dashboard "D"')).toMatchObject({
      code: "E_BAD_PATH",
      line: 2,
      column: 6,
    });
  });

  it("points at the exact column of a bad column type", () => {
    const d = firstError('app "X"\npage /a "A"\n  table @orders cols=id,total:moneyy');
    expect(d).toMatchObject({ code: "E_BAD_VALUE", line: 3, column: 31 });
    expect(d.hint).toContain('"money"');
  });

  it("rejects select fields without options and options on other fields", () => {
    expect(firstError('app "X"\npage /a "A"\n  form fields=plan:select -> api.go')).toMatchObject({
      code: "E_BAD_FIELDS",
      line: 3,
    });
    expect(
      firstError('app "X"\npage /a "A"\n  form fields=name:text(a|b) -> api.go').message,
    ).toContain("only select");
  });

  it("rejects duplicate columns and fields", () => {
    expect(firstError('app "X"\npage /a "A"\n  table @t cols=a,a').message).toContain(
      "duplicate column",
    );
    expect(firstError('app "X"\npage /a "A"\n  form fields=a,a -> api.go').message).toContain(
      "duplicate field",
    );
  });

  it("rejects out-of-range numbers", () => {
    expect(firstError('app "X"\npage /a "A"\n  grid 9').message).toContain("1 to 6");
    expect(firstError('app "X"\npage /a "A"\n  table @t cols=a page=0').message).toContain(
      "1 to 200",
    );
    expect(firstError('app "X"\npage /a "A"\n  row kpi*0 @m').message).toContain("1 to 12");
  });

  it("rejects unknown themes, nav modes, variants and chart kinds", () => {
    expect(firstError('app "X" theme=neon')).toMatchObject({
      code: "E_BAD_VALUE",
      line: 1,
      column: 15,
    });
    expect(firstError('app "X" nav=left').message).toContain("nav mode");
    expect(firstError('app "X"\npage /a "A"\n  button "B" ~danger').hint).toContain(
      '"destructive"',
    );
    expect(firstError('app "X"\npage /a "A"\n  chart pie @d x=a').message).toContain("chart kind");
  });

  it("rejects malformed actions", () => {
    expect(firstError('app "X"\npage /a "A"\n  button "B" -> do it')).toMatchObject({
      code: "E_BAD_ACTION",
    });
    expect(firstError('app "X"\npage /a "A"\n  button "B" ->')).toMatchObject({
      code: "E_MISSING_ACTION_TARGET",
      line: 3,
    });
    expect(firstError('app "X"\npage /a "A"\n  button "B" -> api.x(1)').message).toContain(
      "invalid action argument",
    );
  });

  it("rejects malformed bindings and duplicates", () => {
    expect(firstError('app "X"\npage /a "A"\n  chart line @1x x=a')).toMatchObject({
      code: "E_BAD_BIND",
      line: 3,
    });
    expect(firstError('app "X"\npage /a "A"\n  chart line @a @b x=a')).toMatchObject({
      code: "E_DUPLICATE",
      line: 3,
    });
  });

  it("rejects modifiers a node does not take", () => {
    expect(firstError('app "X"\npage /a "A"\n  text "t" @data')).toMatchObject({
      code: "E_UNEXPECTED_BIND",
    });
    expect(firstError('app "X"\npage /a "A"\n  grid 2 "t"')).toMatchObject({
      code: "E_UNEXPECTED_TEXT",
    });
    expect(firstError('app "X"\npage /a "A"\n  card ~muted')).toMatchObject({
      code: "E_UNEXPECTED_VARIANT",
    });
    expect(firstError('app "X"\npage /a "A"\n  card -> api.x')).toMatchObject({
      code: "E_UNEXPECTED_ACTION",
    });
  });

  it("collects several errors in one pass, ordered by position", () => {
    const { diagnostics } = parse('app "X" theme=neon\npage dashboard "D"\n  tabel');
    expect(diagnostics.map((d) => d.line)).toEqual([1, 2, 3]);
  });

  it("parses landing blocks and ember theme", () => {
    const src = `app "Landing" theme=ember
page / "Home"
  hero "Headline" subtitle="Sub" align=left
    button "Go" -> /dash
  features @items cols=2 "Features"
  cta "Start now"
    button "Sign up" -> api.join
`;
    const { app, diagnostics } = parse(src);
    expect(diagnostics).toEqual([]);
    expect(app?.theme).toBe("ember");
    const page = app?.children[0];
    expect(page?.children.map((c) => c.type)).toEqual(["hero", "features", "cta"]);
    const hero = page?.children[0];
    if (hero?.type === "hero") {
      expect(hero.align).toBe("left");
      expect(hero.children[0]?.type).toBe("button");
    }
  });
});
