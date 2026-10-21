import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTheme, themeCss, themeNames } from "../src";

const tokenFile = (name: string) =>
  JSON.parse(readFileSync(new URL(`../tokens/${name}.json`, import.meta.url), "utf8")) as Record<
    string,
    Record<string, unknown>
  >;

function leafNames(group: Record<string, unknown>): string[] {
  return Object.keys(group).filter((k) => !k.startsWith("$"));
}

describe("aurora theme", () => {
  const theme = getTheme("aurora");

  it("is registered", () => {
    expect(themeNames).toContain("aurora");
    expect(theme.name).toBe("aurora");
  });

  it("emits light variables on :root and dark overrides on .dark", () => {
    expect(theme.vars).toMatch(/^:root \{/m);
    expect(theme.vars).toMatch(/^\.dark \{/m);
    expect(theme.vars).toContain("--background: oklch(");
    expect(theme.vars).toContain("--radius: 0.625rem;");
  });

  it("defines every shadcn semantic color", () => {
    for (const name of [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "primary",
      "primary-foreground",
      "secondary",
      "muted",
      "muted-foreground",
      "accent",
      "destructive",
      "border",
      "input",
      "ring",
      "success",
      "warning",
      "chart-1",
      "chart-5",
      "sidebar",
    ]) {
      expect(theme.tokenNames, name).toContain(name);
    }
  });

  it("keeps light and dark token sets in parity", () => {
    const light = leafNames(tokenFile("aurora").color!).sort();
    const dark = leafNames(tokenFile("aurora.dark").color!).sort();
    expect(dark).toEqual(light);
  });

  it("uses DTCG $value/$type and never raw hex", () => {
    for (const file of ["aurora", "aurora.dark"]) {
      const color = tokenFile(file).color!;
      expect(color.$type).toBe("color");
      for (const name of leafNames(color)) {
        const value = (color[name] as { $value: string }).$value;
        expect(value, `${file}:${name}`).toMatch(/^oklch\(/);
      }
    }
    expect(themeCss("aurora")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("maps every color token into the Tailwind v4 theme", () => {
    expect(theme.tailwind).toMatch(/^@theme inline \{/);
    const colorNames = leafNames(tokenFile("aurora").color!);
    for (const name of colorNames) {
      expect(theme.tailwind).toContain(`--color-${name}: var(--${name});`);
    }
    expect(theme.tailwind).toContain("--radius-md: calc(var(--radius) - 2px);");
  });

  it("combines variables and theme into one stylesheet", () => {
    const css = themeCss("aurora");
    expect(css.indexOf(":root")).toBeLessThan(css.indexOf("@theme inline"));
  });

  it("throws a helpful error for unknown themes", () => {
    expect(() => getTheme("neon")).toThrow(/Unknown theme "neon"\. Available: aurora/);
  });
});
