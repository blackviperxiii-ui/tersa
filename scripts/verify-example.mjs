// Generates the dashboard example, installs it, and runs next build + typecheck.
// This is what CI uses to prove the generator output really builds.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".tmp", "example");
const sh = (cmd, cwd = root) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
};

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
sh(`node packages/cli/dist/bin.js gen examples/dashboard/app.tsa -o ${path.relative(root, out)}`);
sh("pnpm install --ignore-workspace --no-frozen-lockfile", out);
sh("pnpm exec tsc --noEmit", out);
sh("pnpm exec next build", out);
console.log("\nexample: generated app builds and typechecks");
