import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generate } from "@tersa/gen-next";
import { compile, TersaError } from "@tersa/spec";

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
  const files = generate(app);
  for (const file of files) {
    const target = path.join(outDir, file.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  return { outDir, files: files.map((f) => f.path) };
}

const HELP = `tersa - compact spec in, polished shadcn code out

Usage:
  tersa gen <file.tsa> [-o <dir>]   Generate a Next.js app (default dir: out/)
  tersa --help                      Show this help
  tersa --version                   Print the version
`;

export interface CliIO {
  log: (s: string) => void;
  error: (s: string) => void;
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
  if (command !== "gen") {
    io.error(`Unknown command "${command}".\n\n${HELP}`);
    return 1;
  }

  let input: string | undefined;
  let out: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "-o" || arg === "--out") {
      out = rest[++i];
      if (out === undefined) {
        io.error("Missing value after -o");
        return 1;
      }
    } else if (arg.startsWith("-")) {
      io.error(`Unknown option "${arg}".\n\n${HELP}`);
      return 1;
    } else if (input === undefined) input = arg;
    else {
      io.error(`Unexpected argument "${arg}".`);
      return 1;
    }
  }
  if (!input) {
    io.error(`Missing spec file.\n\n${HELP}`);
    return 1;
  }

  try {
    const result = gen({ input, out, cwd });
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

export const VERSION = "0.1.0";
