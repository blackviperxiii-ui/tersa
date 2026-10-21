import type { AppNode } from "./ast";
import { TersaError, type Diagnostic } from "./errors";
import { parse } from "./parser";
import { validate } from "./validator";

export * from "./ast";
export { TersaError, formatDiagnostic, type Diagnostic } from "./errors";
export { parse, type ParseResult } from "./parser";
export { validate } from "./validator";
export {
  BUTTON_VARIANTS,
  CHART_KINDS,
  COLUMN_TYPES,
  FIELD_TYPES,
  KPI_FORMATS,
  NAV_MODES,
  NODE_SPECS,
  NODE_TYPES,
  TEXT_VARIANTS,
  THEMES,
  type NodeSpec,
  type NodeType,
} from "./specs";

export interface CompileOptions {
  /** File name used in error messages. */
  file?: string;
}

/** Parse and validate. Returns the AST, or throws a TersaError listing every problem. */
export function compile(source: string, options: CompileOptions = {}): AppNode {
  const { app, diagnostics } = parse(source);
  const all: Diagnostic[] = [...diagnostics];
  if (app && diagnostics.length === 0) all.push(...validate(app));
  if (!app || all.length > 0) {
    throw new TersaError(all, source, options.file);
  }
  return app;
}
