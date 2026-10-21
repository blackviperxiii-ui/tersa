export type Cell = string | number | boolean;
export type Row = Record<string, Cell>;

export type ColumnType = "text" | "number" | "money" | "badge" | "date" | "email";
export interface Column {
  key: string;
  type: ColumnType;
}

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost";
export interface RowAction {
  label: string;
  variant: ButtonVariant;
  fn: string;
  args: string[];
  confirm: boolean;
}

export type FieldType = "text" | "email" | "number" | "select" | "textarea" | "checkbox";
export interface Field {
  name: string;
  type: FieldType;
  options?: string[];
}

export type KpiFormat = "number" | "money" | "percent";
export interface KpiItem {
  label: string;
  value: number;
  format: KpiFormat;
  delta?: number;
}
export const kpi = (item: KpiItem): KpiItem => item;
