import type {
  BUTTON_VARIANTS,
  CHART_KINDS,
  COLUMN_TYPES,
  FIELD_TYPES,
  KPI_FORMATS,
  NAV_MODES,
  TEXT_VARIANTS,
} from "./specs";

export interface Loc {
  line: number;
  column: number;
}

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type TextVariant = (typeof TEXT_VARIANTS)[number];
export type NavMode = (typeof NAV_MODES)[number];
export type ChartKind = (typeof CHART_KINDS)[number];
export type KpiFormat = (typeof KPI_FORMATS)[number];
export type ColumnType = (typeof COLUMN_TYPES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];

/** `-> api.fn(arg, ...)` calls a function in the generated api module; `-> /path` navigates. */
export type ActionRef =
  | { kind: "api"; fn: string; args: string[]; raw: string }
  | { kind: "nav"; to: string; raw: string };

export interface ColumnDef {
  key: string;
  type: ColumnType;
}

export interface FieldDef {
  name: string;
  type: FieldType;
  options?: string[];
}

interface Base {
  /** From `#id`. */
  id?: string;
  loc: Loc;
  children: Node[];
}

export interface AppNode extends Base {
  type: "app";
  name: string;
  theme: string;
  dark: boolean;
  nav: NavMode;
}
export interface PageNode extends Base {
  type: "page";
  path: string;
  title: string;
}
export interface RowNode extends Base {
  type: "row";
  repeat?: { of: "kpi"; count: number };
  bind?: string;
}
export interface GridNode extends Base {
  type: "grid";
  cols: number;
}
export interface CardNode extends Base {
  type: "card";
  title?: string;
}
export interface KpiNode extends Base {
  type: "kpi";
  label?: string;
  bind?: string;
  format: KpiFormat;
}
export interface ChartNode extends Base {
  type: "chart";
  kind: ChartKind;
  bind: string;
  x: string;
  y: string;
  title?: string;
}
export interface TableNode extends Base {
  type: "table";
  bind: string;
  cols: ColumnDef[];
  sort: boolean;
  search: boolean;
  pageSize: number;
  title?: string;
}
export interface FormNode extends Base {
  type: "form";
  bind?: string;
  fields: FieldDef[];
  action: ActionRef;
  title?: string;
  submitLabel: string;
}
export interface ButtonNode extends Base {
  type: "button";
  label: string;
  variant: ButtonVariant;
  action?: ActionRef;
}
export interface TextNode extends Base {
  type: "text";
  text: string;
  variant: TextVariant;
}
export interface ActionNode extends Base {
  type: "action";
  label: string;
  variant: ButtonVariant;
  action: ActionRef;
  confirm: boolean;
}

export type Node =
  | AppNode
  | PageNode
  | RowNode
  | GridNode
  | CardNode
  | KpiNode
  | ChartNode
  | TableNode
  | FormNode
  | ButtonNode
  | TextNode
  | ActionNode;
