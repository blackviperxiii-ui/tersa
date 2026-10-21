export const NODE_TYPES = [
  "app",
  "page",
  "row",
  "grid",
  "card",
  "kpi",
  "chart",
  "table",
  "form",
  "button",
  "text",
  "action",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const THEMES = ["aurora"] as const;
export const NAV_MODES = ["sidebar", "top", "none"] as const;
export const BUTTON_VARIANTS = ["default", "destructive", "outline", "secondary", "ghost"] as const;
export const TEXT_VARIANTS = ["default", "heading", "muted"] as const;
export const CHART_KINDS = ["line", "bar"] as const;
export const KPI_FORMATS = ["number", "money", "percent"] as const;
export const COLUMN_TYPES = ["text", "number", "money", "badge", "date", "email"] as const;
export const FIELD_TYPES = ["text", "email", "number", "select", "textarea", "checkbox"] as const;

export type Presence = "required" | "optional" | "none";

export interface NodeSpec {
  type: NodeType;
  /** Names of positional slots, in order. */
  positional: readonly string[];
  requiredPositional: readonly string[];
  props: readonly string[];
  requiredProps: readonly string[];
  flags: readonly string[];
  text: Presence;
  bind: Presence;
  variant: boolean;
  action: Presence;
  /** Node types allowed as children. */
  children: readonly NodeType[];
  /** One-line usage shown in error hints and docs. */
  usage: string;
}

const CONTENT: readonly NodeType[] = [
  "row",
  "grid",
  "card",
  "kpi",
  "chart",
  "table",
  "form",
  "button",
  "text",
];

export const NODE_SPECS: Record<NodeType, NodeSpec> = {
  app: {
    type: "app",
    positional: [],
    requiredPositional: [],
    props: ["theme", "nav"],
    requiredProps: [],
    flags: ["dark"],
    text: "required",
    bind: "none",
    variant: false,
    action: "none",
    children: ["page"],
    usage: 'app "Name" [theme=aurora] [dark] [nav=sidebar|top|none]',
  },
  page: {
    type: "page",
    positional: ["path"],
    requiredPositional: ["path"],
    props: [],
    requiredProps: [],
    flags: [],
    text: "required",
    bind: "none",
    variant: false,
    action: "none",
    children: CONTENT,
    usage: 'page /path "Title"',
  },
  row: {
    type: "row",
    positional: ["repeat"],
    requiredPositional: [],
    props: [],
    requiredProps: [],
    flags: [],
    text: "none",
    bind: "optional",
    variant: false,
    action: "none",
    children: CONTENT,
    usage: "row [kpi*N @data]",
  },
  grid: {
    type: "grid",
    positional: ["cols"],
    requiredPositional: ["cols"],
    props: [],
    requiredProps: [],
    flags: [],
    text: "none",
    bind: "none",
    variant: false,
    action: "none",
    children: CONTENT,
    usage: "grid <1-6>",
  },
  card: {
    type: "card",
    positional: [],
    requiredPositional: [],
    props: [],
    requiredProps: [],
    flags: [],
    text: "optional",
    bind: "none",
    variant: false,
    action: "none",
    children: CONTENT,
    usage: 'card ["Title"]',
  },
  kpi: {
    type: "kpi",
    positional: [],
    requiredPositional: [],
    props: ["format"],
    requiredProps: [],
    flags: [],
    text: "optional",
    bind: "optional",
    variant: false,
    action: "none",
    children: [],
    usage: 'kpi [@data] ["Label"] [format=number|money|percent]',
  },
  chart: {
    type: "chart",
    positional: ["kind"],
    requiredPositional: ["kind"],
    props: ["x", "y"],
    requiredProps: ["x"],
    flags: [],
    text: "optional",
    bind: "required",
    variant: false,
    action: "none",
    children: [],
    usage: 'chart line|bar @data x=field [y=field] ["Title"]',
  },
  table: {
    type: "table",
    positional: [],
    requiredPositional: [],
    props: ["cols", "page"],
    requiredProps: ["cols"],
    flags: ["sort", "search"],
    text: "optional",
    bind: "required",
    variant: false,
    action: "none",
    children: ["action"],
    usage: 'table @data cols=key[:type],... [sort] [search] [page=N] ["Title"]',
  },
  form: {
    type: "form",
    positional: [],
    requiredPositional: [],
    props: ["fields", "submit"],
    requiredProps: ["fields"],
    flags: [],
    text: "optional",
    bind: "optional",
    variant: false,
    action: "required",
    children: [],
    usage: 'form [@data] fields=name[:type],... -> api.fn ["Title"] [submit="Label"]',
  },
  button: {
    type: "button",
    positional: [],
    requiredPositional: [],
    props: [],
    requiredProps: [],
    flags: [],
    text: "required",
    bind: "none",
    variant: true,
    action: "optional",
    children: [],
    usage: 'button "Label" [~variant] [-> api.fn | -> /path]',
  },
  text: {
    type: "text",
    positional: [],
    requiredPositional: [],
    props: [],
    requiredProps: [],
    flags: [],
    text: "required",
    bind: "none",
    variant: true,
    action: "none",
    children: [],
    usage: 'text "Copy" [~heading|~muted]',
  },
  action: {
    type: "action",
    positional: [],
    requiredPositional: [],
    props: [],
    requiredProps: [],
    flags: ["confirm"],
    text: "required",
    bind: "none",
    variant: true,
    action: "required",
    children: [],
    usage: 'action "Label" [~variant] -> api.fn(arg) [confirm]',
  },
};
