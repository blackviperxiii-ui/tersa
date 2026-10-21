import { describe, expect, it } from "vitest";
import { compile, TersaError, validate, parse } from "../src";

function codes(source: string): string[] {
  const { app, diagnostics } = parse(source);
  expect(diagnostics).toEqual([]);
  return validate(app!).map((d) => d.code);
}

describe("validate", () => {
  it("accepts a well-formed app", () => {
    expect(codes('app "X"\npage /a "A"\n  card "C"\n    text "hi"')).toEqual([]);
  });

  it("requires at least one page", () => {
    expect(codes('app "X"')).toEqual(["E_NO_PAGES"]);
  });

  it("rejects action nodes outside a table", () => {
    const src = 'app "X"\npage /a "A"\n  card\n    action "Go" -> api.go';
    expect(codes(src)).toEqual(["E_BAD_CHILD"]);
  });

  it("rejects children under leaf nodes", () => {
    const src = 'app "X"\npage /a "A"\n  button "B"\n    text "nested"';
    expect(codes(src)).toEqual(["E_BAD_CHILD"]);
  });

  it("rejects pages that are not direct children of the app", () => {
    const src = 'app "X"\npage /a "A"\n  page /b "B"';
    expect(codes(src)).toEqual(["E_BAD_CHILD"]);
  });

  it("rejects duplicate page paths and ids", () => {
    expect(codes('app "X"\npage /a "A"\npage /a "B"')).toEqual(["E_DUPLICATE_PAGE"]);
    expect(codes('app "X"\npage /a "A"\n  text "1" #t\n  text "2" #t')).toEqual(["E_DUPLICATE_ID"]);
  });

  it("requires a binding on repeating rows and forbids children", () => {
    expect(codes('app "X"\npage /a "A"\n  row kpi*3')).toEqual(["E_MISSING_BIND"]);
    expect(codes('app "X"\npage /a "A"\n  row kpi*3 @m\n    text "x"')).toEqual(["E_BAD_CHILD"]);
  });
});

describe("compile", () => {
  it("returns the app for valid input", () => {
    expect(compile('app "X"\npage /a "A"').name).toBe("X");
  });

  it("throws a TersaError with file, line, column, source line and caret", () => {
    let error: unknown;
    try {
      compile('app "X"\npage /a "A"\n  tabel @t', { file: "app.tsa" });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(TersaError);
    const msg = (error as TersaError).message;
    expect(msg).toContain("app.tsa:3:3 error[E_UNKNOWN_NODE]");
    expect(msg).toContain("3 |   tabel @t");
    expect(msg).toContain("^^^^^");
    expect(msg).toContain('did you mean "table"?');
    expect(msg).toContain("1 error in app.tsa");
  });

  it("reports structural errors from the validator", () => {
    expect(() => compile('app "X"')).toThrow(/E_NO_PAGES/);
  });

  it("throws on an empty file", () => {
    expect(() => compile("")).toThrow(TersaError);
  });
});
