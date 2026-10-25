import { describe, expect, it } from "vitest";
import { compile } from "@tersa/spec";
import { generate } from "../src";
import { extractSlots, injectSlots, slotBegin, slotEnd } from "../src/slots";

describe("protected slots", () => {
  it("preserves custom slot bodies across regeneration", () => {
    const spec = 'app "Demo"\npage /home "Home"\n  text "hi"\n';
    const app = compile(spec);
    const first = generate(app).find((f) => f.path === "lib/api.ts")!.content;
    const custom = `${slotBegin("custom")}export const extra = 1;\n${slotEnd("custom")}`;
    const onDisk = first.replace(
      /\/\/ @tersa-slot begin custom[\s\S]*\/\/ @tersa-slot end custom/,
      custom.trimEnd(),
    );
    const preserved = extractSlots(onDisk);
    expect(preserved.get("custom")).toContain("export const extra = 1");

    const regen = generate(app).find((f) => f.path === "lib/api.ts")!.content;
    const merged = injectSlots(regen, preserved);
    expect(merged).toContain("export const extra = 1");
  });
});
