import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "@tersa/gen-next";
import { compile } from "@tersa/spec";

const TEMPLATE_DIR = fileURLToPath(new URL("../templates/init/", import.meta.url));

export interface InitOptions {
  /** Target directory (created if missing). Defaults to cwd. */
  dir?: string;
  /** App name for the example spec. */
  name?: string;
  cwd?: string;
}

function copyTemplate(name: string, dest: string) {
  writeFileSync(dest, readFileSync(path.join(TEMPLATE_DIR, name), "utf8"));
}

/** Scaffold a new tersa project: app.tsa, agent templates, and generated Next.js app in ./out. */
export function init(options: InitOptions = {}): { dir: string; specPath: string; outDir: string } {
  const cwd = options.cwd ?? process.cwd();
  const dir = path.resolve(cwd, options.dir ?? ".");
  const name = options.name ?? "My App";
  if (existsSync(path.join(dir, "app.tsa"))) {
    throw new Error(`app.tsa already exists in ${dir}`);
  }
  mkdirSync(dir, { recursive: true });
  mkdirSync(path.join(dir, ".cursor", "rules"), { recursive: true });

  let spec = readFileSync(path.join(TEMPLATE_DIR, "app.tsa"), "utf8");
  spec = spec.replace(/^app ".*"/m, `app "${name}"`);
  const specPath = path.join(dir, "app.tsa");
  writeFileSync(specPath, spec);

  copyTemplate("CLAUDE.md", path.join(dir, "CLAUDE.md"));
  copyTemplate("tersa.mdc", path.join(dir, ".cursor", "rules", "tersa.mdc"));
  writeFileSync(
    path.join(dir, "README.md"),
    `# ${name}

Edit \`app.tsa\`, then:

\`\`\`sh
tersa check app.tsa
tersa diff app.tsa -o out
tersa gen app.tsa -o out
cd out && pnpm install && pnpm dev
\`\`\`
`,
  );

  const app = compile(spec, { file: "app.tsa" });
  const outDir = path.join(dir, "out");
  const files = generate(app);
  for (const file of files) {
    const target = path.join(outDir, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  return { dir, specPath, outDir };
}
