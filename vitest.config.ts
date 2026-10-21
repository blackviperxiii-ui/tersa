import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(`./packages/${p}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@tersa/spec": src("spec"),
      "@tersa/themes": src("themes"),
      "@tersa/gen-next": src("gen-next"),
      "@tersa/cli": src("cli"),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
