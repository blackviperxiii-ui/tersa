import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generate } from "@tersa/gen-next";
import { compile, TersaError } from "@tersa/spec";
import { check, formatCheckResult } from "./check";
import { diff, formatDiff } from "./diff";
import { init } from "./init";

export interface GenResult {
  outDir: string;
  files: string[];
}

export interface GenOptions {
  input: string;
  out?: string;
  cwd?: string;
}

/** Compile a .tsa file and write the Next.js app to `out` (default: ./out). */
export function gen(options: GenOptions): GenResult {
  const cwd = options.cwd ?? process.cwd();
  const input = path.resolve(cwd, options.input);
  if (!existsSync(input)) throw new Error(`No such file: ${options.input}`);
  const source = readFileSync(input, "utf8");
  const app = compile(source, { file: path.relative(cwd, input) || options.input });
  const outDir = path.resolve(cwd, options.out ?? "out");
  const existingDir = existsSync(outDir) ? outDir : undefined;
  const files = generate(app, { existingDir });
  for (const file of files) {
    const target = path.join(outDir, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  return { outDir, files: files.map((f) => f.path) };
}

const HELP = `tersa - compact spec in, polished shadcn code out

Usage:
  tersa init [dir] [--name "App"]     Scaffold app.tsa, agent files, and out/
  tersa check <file.tsa> [...]        Validate spec(s); exit 2 on errors
  tersa diff <file.tsa> [-o <dir>]    Show what gen would change (dry run)
  tersa gen <file.tsa> [-o <dir>]     Generate a Next.js app (default dir: out/)
  tersa --help                        Show this help
  tersa --version                     Print the version
`;

export interface CliIO {
  log: (s: string) => void;
  error: (s: string) => void;
}

function parseOutFlag(rest: string[], io: CliIO): { args: string[]; out?: string } | null {
  const args: string[] = [];
  let out: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "-o" || arg === "--out") {
      out = rest[++i];
      if (out === undefined) {
        io.error("Missing value after -o");
        return null;
      }
    } else if (arg.startsWith("-")) {
      io.error(`Unknown option "${arg}".\n\n${HELP}`);
      return null;
    } else args.push(arg);
  }
  return { args, out };
}

/** Runs the CLI with the given argv (without node and script). Returns the exit code. */
export function run(
  argv: string[],
  io: CliIO = { log: console.log, error: console.error },
  cwd = process.cwd(),
): number {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h" || command === "help") {
    io.log(HELP);
    return command ? 0 : 1;
  }
  if (command === "--version" || command === "-v") {
    io.log(VERSION);
    return 0;
  }

  if (command === "init") {
    let name: string | undefined;
    const positional: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i]!;
      if (arg === "--name") {
        name = rest[++i];
        if (name === undefined) {
          io.error("Missing value after --name");
          return 1;
        }
      } else if (arg.startsWith("-")) {
        io.error(`Unknown option "${arg}".\n\n${HELP}`);
        return 1;
      } else positional.push(arg);
    }
    if (positional.length > 1) {
      io.error(`Unexpected arguments: ${positional.slice(1).join(" ")}`);
      return 1;
    }
    const dir = positional[0];
    try {
      const result = init({ dir, name, cwd });
      io.log(`Initialized ${path.relative(cwd, result.dir) || "."}/`);
      io.log(`  app.tsa`);
      io.log(`  out/ (${result.outDir})`);
      io.log("Next: tersa check app.tsa && cd out && pnpm install && pnpm dev");
      return 0;
    } catch (error) {
      io.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (command === "check") {
    if (!rest.length) {
      io.error(`Missing spec file(s).\n\n${HELP}`);
      return 1;
    }
    const parsed = parseOutFlag(rest, io);
    if (!parsed) return 1;
    if (parsed.out) {
      io.error("check does not take -o");
      return 1;
    }
    const sourceByFile = new Map<string, string>();
    for (const f of parsed.args) {
      const full = path.resolve(cwd, f);
      if (existsSync(full)) sourceByFile.set(f, readFileSync(full, "utf8"));
    }
    const result = check({ inputs: parsed.args, cwd });
    io.log(formatCheckResult(result, sourceByFile));
    return result.ok ? 0 : 2;
  }

  if (command === "diff") {
    const parsed = parseOutFlag(rest, io);
    if (!parsed) return 1;
    const [input, ...extra] = parsed.args;
    if (!input || extra.length) {
      io.error(`Usage: tersa diff <file.tsa> [-o <dir>]\n\n${HELP}`);
      return 1;
    }
    try {
      const result = diff({ input, out: parsed.out, cwd });
      io.log(formatDiff(result));
      return result.hasChanges ? 1 : 0;
    } catch (error) {
      if (error instanceof TersaError) {
        io.error(error.message);
        return 2;
      }
      io.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  if (command !== "gen") {
    io.error(`Unknown command "${command}".\n\n${HELP}`);
    return 1;
  }

  const parsed = parseOutFlag(rest, io);
  if (!parsed) return 1;
  const [input, ...extra] = parsed.args;
  if (!input || extra.length) {
    io.error(`Missing spec file.\n\n${HELP}`);
    return 1;
  }

  try {
    const result = gen({ input, out: parsed.out, cwd });
    io.log(
      `Generated ${result.files.length} files in ${path.relative(cwd, result.outDir) || "."}/`,
    );
    io.log("Next: cd into it, pnpm install, pnpm dev");
    return 0;
  } catch (error) {
    if (error instanceof TersaError) {
      io.error(error.message);
      return 2;
    }
    io.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export const VERSION = "0.2.0";
export { check, diff, init };
