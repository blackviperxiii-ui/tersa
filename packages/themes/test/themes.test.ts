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

for (const themeId of ["aurora", "ember"] as const) {
  describe(`${themeId} theme`, () => {
    const theme = getTheme(themeId);

    it("is registered", () => {
      expect(themeNames).toContain(themeId);
      expect(theme.name).toBe(themeId);
    });

    it("emits light variables on :root and dark overrides on .dark", () => {
      expect(theme.vars).toMatch(/^:root \{/m);
      expect(theme.vars).toMatch(/^\.dark \{/m);
      expect(theme.vars).toContain("--background: oklch(");
      expect(theme.vars).toMatch(/--radius: 0\.\d+rem;/);
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
      const light = leafNames(tokenFile(themeId).color!).sort();
      const dark = leafNames(tokenFile(`${themeId}.dark`).color!).sort();
      expect(dark).toEqual(light);
    });

    it("uses DTCG $value/$type and never raw hex", () => {
      for (const file of [themeId, `${themeId}.dark`]) {
        const color = tokenFile(file).color!;
        expect(color.$type).toBe("color");
        for (const name of leafNames(color)) {
          const value = (color[name] as { $value: string }).$value;
          expect(value, `${file}:${name}`).toMatch(/^oklch\(/);
        }
      }
      expect(themeCss(themeId)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it("maps every color token into the Tailwind v4 theme", () => {
      expect(theme.tailwind).toMatch(/^@theme inline \{/);
      const colorNames = leafNames(tokenFile(themeId).color!);
      for (const name of colorNames) {
        expect(theme.tailwind).toContain(`--color-${name}: var(--${name});`);
      }
      expect(theme.tailwind).toContain("--radius-md: calc(var(--radius) - 2px);");
    });

    it("combines variables and theme into one stylesheet", () => {
      const css = themeCss(themeId);
      expect(css.indexOf(":root")).toBeLessThan(css.indexOf("@theme inline"));
    });
  });
}

describe("theme registry", () => {
  it("throws a helpful error for unknown themes", () => {
    expect(() => getTheme("neon")).toThrow(/Unknown theme "neon"\. Available: aurora, ember/);
  });
});
