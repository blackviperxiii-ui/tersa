/** Banner on fully generated files (pages, layout, etc.). */
export const GENERATED_BANNER =
  "/* @tersa-generated — regenerate with `tersa gen`; do not edit by hand. */\n";

export function slotBegin(name: string): string {
  return `// @tersa-slot begin ${name}\n`;
}

export function slotEnd(name: string): string {
  return `// @tersa-slot end ${name}\n`;
}

const SLOT_RE = /\/\/ @tersa-slot begin ([\w-]+)\n([\s\S]*?)\/\/ @tersa-slot end \1\n?/g;

/** Reads preserved slot bodies from an existing generated file. */
export function extractSlots(content: string): Map<string, string> {
  const slots = new Map<string, string>();
  for (const m of content.matchAll(SLOT_RE)) {
    slots.set(m[1]!, m[2]!);
  }
  return slots;
}

/** Replaces slot regions in `content` with bodies from `preserved` when present. */
export function injectSlots(content: string, preserved: Map<string, string>): string {
  if (preserved.size === 0) return content;
  return content.replace(SLOT_RE, (full, name: string, _body: string) => {
    const saved = preserved.get(name);
    if (saved === undefined) return full;
    return `${slotBegin(name)}${saved}${slotEnd(name)}`;
  });
}

export function withGeneratedBanner(content: string): string {
  if (content.startsWith("/* @tersa-generated")) return content;
  return GENERATED_BANNER + content;
}
