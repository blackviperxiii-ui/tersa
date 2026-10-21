import { auroraTailwind, auroraTokenNames, auroraVars } from "./generated/aurora";

export interface Theme {
  name: string;
  /** `:root` and `.dark` CSS variable blocks. */
  vars: string;
  /** Tailwind v4 `@theme inline` block that maps the variables to utilities. */
  tailwind: string;
  /** CSS variable names defined by the theme, without the leading `--`. */
  tokenNames: string[];
}

export const themes: Record<string, Theme> = {
  aurora: {
    name: "aurora",
    vars: auroraVars,
    tailwind: auroraTailwind,
    tokenNames: auroraTokenNames,
  },
};

export const themeNames = Object.keys(themes);

export function getTheme(name: string): Theme {
  const theme = themes[name];
  if (!theme) {
    throw new Error(`Unknown theme "${name}". Available: ${themeNames.join(", ")}`);
  }
  return theme;
}

/** The theme as one stylesheet fragment: variables first, then the Tailwind mapping. */
export function themeCss(name: string): string {
  const t = getTheme(name);
  return `${t.vars}\n${t.tailwind}`;
}
