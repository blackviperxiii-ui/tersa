import type { AppNode, Node } from "./ast";
import type { Diagnostic } from "./errors";
import { NODE_SPECS } from "./specs";

const RESERVED = new Set(
  (
    "break case catch class const continue debugger default delete do else enum export extends " +
    "false finally for function if import in instanceof new null return super switch this throw " +
    "true try typeof var void while with yield let static implements interface package private " +
    "protected public await"
  ).split(" "),
);

type BindKind = "list" | "record" | "item";
const KIND_LABEL: Record<BindKind, string> = {
  list: "list of rows",
  record: "record",
  item: "single metric",
};

/** Structural checks on a parsed tree: nesting rules, uniqueness, cross-node requirements. */
export function validate(app: AppNode): Diagnostic[] {
  const out: Diagnostic[] = [];
  const add = (node: Node, code: string, message: string, hint?: string) =>
    out.push({
      code,
      message,
      line: node.loc.line,
      column: node.loc.column,
      length: node.type.length,
      ...(hint ? { hint } : {}),
    });

  const ids = new Map<string, Node>();
  const paths = new Map<string, Node>();
  const bindings = new Map<string, { kind: BindKind; node: Node }>();

  const useBinding = (node: Node, bind: string, kind: BindKind) => {
    const root = bind.split(".")[0]!;
    if (RESERVED.has(root)) {
      add(
        node,
        "E_RESERVED_BIND",
        `"@${root}" is a reserved word and cannot name data`,
        "pick another name",
      );
      return;
    }
    if (kind !== "record" && kind !== "item" && bind.includes(".")) {
      add(
        node,
        "E_BAD_BIND",
        `only kpi bindings can use dots, found "@${bind}"`,
        `bind to "@${root}"`,
      );
    }
    const prev = bindings.get(root);
    if (!prev) bindings.set(root, { kind, node });
    else if (prev.kind !== kind) {
      add(
        node,
        "E_BIND_CONFLICT",
        `"@${root}" is a ${KIND_LABEL[kind]} here but a ${KIND_LABEL[prev.kind]} on line ${prev.node.loc.line}`,
        "use a different name for each shape of data",
      );
    }
  };

  const walk = (node: Node, parent?: Node) => {
    if (parent) {
      const allowed = NODE_SPECS[parent.type].children;
      if (!allowed.includes(node.type)) {
        add(
          node,
          "E_BAD_CHILD",
          allowed.length === 0
            ? `"${parent.type}" cannot contain other nodes, found "${node.type}"`
            : `"${node.type}" cannot be nested inside "${parent.type}"`,
          node.type === "action"
            ? "action nodes belong directly under a table"
            : node.type === "page"
              ? "pages are written at the top level, after the app line"
              : allowed.length === 0
                ? `dedent "${node.type}" to the level of "${parent.type}"`
                : `"${parent.type}" can contain: ${allowed.join(", ")}`,
        );
      }
    }

    if (node.id !== undefined) {
      const prev = ids.get(node.id);
      if (prev) {
        add(
          node,
          "E_DUPLICATE_ID",
          `duplicate id "#${node.id}"`,
          `already used on line ${prev.loc.line}`,
        );
      } else ids.set(node.id, node);
    }

    if (node.type === "page") {
      const prev = paths.get(node.path);
      if (prev) {
        add(
          node,
          "E_DUPLICATE_PAGE",
          `duplicate page path "${node.path}"`,
          `already used on line ${prev.loc.line}`,
        );
      } else paths.set(node.path, node);
    }

    if (node.type === "row" && node.repeat) {
      if (!node.bind) {
        add(
          node,
          "E_MISSING_BIND",
          `"row kpi*${node.repeat.count}" needs a data binding`,
          "write row kpi*4 @metrics",
        );
      }
      if (node.children.length > 0) {
        add(node, "E_BAD_CHILD", "a repeating row generates its own kpis and cannot have children");
      }
    }

    switch (node.type) {
      case "chart":
        useBinding(node, node.bind, "list");
        break;
      case "table": {
        useBinding(node, node.bind, "list");
        const keys = node.cols.map((c) => c.key);
        for (const child of node.children) {
          if (child.type !== "action") continue;
          if (child.action.kind !== "api") {
            add(
              child,
              "E_BAD_ACTION",
              "table actions must call an api function",
              "write -> api.name(id)",
            );
            continue;
          }
          for (const arg of child.action.args) {
            if (!keys.includes(arg)) {
              add(
                child,
                "E_UNKNOWN_FIELD",
                `"${arg}" is not a column of this table`,
                `columns: ${keys.join(", ")}`,
              );
            }
          }
        }
        break;
      }
      case "form":
        if (node.bind) useBinding(node, node.bind, "record");
        if (node.action.kind !== "api") {
          add(node, "E_BAD_ACTION", "a form must submit to an api function", "write -> api.name");
        }
        break;
      case "kpi":
        if (node.bind) useBinding(node, node.bind, node.bind.includes(".") ? "record" : "item");
        break;
      case "row":
        if (node.repeat && node.bind) useBinding(node, node.bind, "list");
        break;
      default:
        break;
    }

    for (const child of node.children) walk(child, node);
  };

  walk(app);
  if (!app.children.some((c) => c.type === "page")) {
    add(app, "E_NO_PAGES", "an app needs at least one page", 'add: page /home "Home"');
  }
  out.sort((a, b) => a.line - b.line || a.column - b.column);
  return out;
}
