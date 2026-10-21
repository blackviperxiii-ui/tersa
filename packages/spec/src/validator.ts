import type { AppNode, Node } from "./ast";
import type { Diagnostic } from "./errors";
import { NODE_SPECS } from "./specs";

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

    for (const child of node.children) walk(child, node);
  };

  walk(app);
  if (!app.children.some((c) => c.type === "page")) {
    add(app, "E_NO_PAGES", "an app needs at least one page", 'add: page /home "Home"');
  }
  out.sort((a, b) => a.line - b.line || a.column - b.column);
  return out;
}
