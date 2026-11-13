# tersa

[![CI](https://github.com/blackviperxiii-ui/tersa/actions/workflows/ci.yml/badge.svg)](https://github.com/blackviperxiii-ui/tersa/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node >=20.9](https://img.shields.io/badge/node-%3E%3D20.9-brightgreen.svg)

Compact spec in, polished shadcn/ui code out — a token-minimizing UI generator for coding agents.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

Coding agents burn thousands of tokens writing repetitive React layout boilerplate, mock fixtures, and design-token wiring. `tersa` replaces that boilerplate with a compact, deterministic `.tsa` specification language.

Write a short `.tsa` spec, run `tersa gen`, and get a complete Next.js App Router + Tailwind CSS v4 + shadcn/ui application with mock data, loading skeletons, empty states, error boundaries, responsive layouts, and design-token themes. `tersa` is strictly a build-time generator, not a runtime renderer—the generated TypeScript and React files are plain source code you own.

## Features

- **Token-minimizing `.tsa` grammar**: Indent-nested, one-node-per-line syntax covering app/page structure (`app`, `page`, `row`, `grid`, `card`), landing sections (`hero`, `features`, `cta`), and interactive UI (`kpi`, `chart`, `table`, `action`, `form`, `button`, `text`).
- **Production-ready Next.js + shadcn/ui output**: Emits `app/<route>/page.tsx` and `loading.tsx` per route, `app/error.tsx`, configurable navigation shells (`sidebar`, `top`, `none`), responsive SVG line and bar charts, client-side sortable/searchable/paginated tables with confirmation dialogs, and typed forms.
- **Deterministic mock data & protected edit slots**: Infers consistent binding shapes (`list`, `record`, `item`) into `lib/data.ts`, `lib/api.ts`, and `lib/stubs.ts`, while preserving hand-written code inside `// @tersa-slot begin custom` … `end custom` regions across regenerations.
- **W3C DTCG design-token themes**: Includes `aurora` and `ember` light/dark presets in OKLCH, compiled via Style Dictionary into `:root` / `.dark` CSS variables and Tailwind v4 `@theme inline` utilities.
- **Actionable diagnostics & dry-run diffs**: Collects all spec errors in a single pass with `file:line:col` positions, caret highlights, and `"did you mean"` hints, plus `tersa diff` to preview changes before writing files.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 20.9`
- [pnpm](https://pnpm.io/) `10.x` (for example, via `corepack enable`)

### Installation

Clone the monorepo, install dependencies (which also builds theme CSS/TypeScript artifacts via `postinstall`), and build all workspace packages:

```sh
git clone https://github.com/blackviperxiii-ui/tersa.git
cd tersa
pnpm install
pnpm build
```

## Usage

### Quick Start

Generate the included dashboard example ([`examples/dashboard/app.tsa`](examples/dashboard/app.tsa)) into `out/` and launch the Next.js development server:

```sh
pnpm gen:example
cd out
pnpm install --ignore-workspace
pnpm dev
```

Open `http://localhost:3000` in your browser. Edit [`examples/dashboard/app.tsa`](examples/dashboard/app.tsa) and run `pnpm gen:example` again from the repository root to update the generated app.

### Example Spec

From [`examples/dashboard/app.tsa`](examples/dashboard/app.tsa):

```text
app "Acme Ops" theme=aurora dark nav=sidebar
page /dashboard "Overview"
  row kpi*4 @metrics
  grid 2
    chart line @revenue x=month y=total "Revenue"
    chart bar @signups x=week "Signups"
  table @orders cols=id,customer,total:money,status:badge sort search page=20
    action "Refund" ~destructive -> api.refund(id) confirm
page /settings "Settings"
  form @user fields=name,email:email,plan:select(free|pro) -> api.saveUser
```

Those 10 lines compile into a two-page application: an overview dashboard with four KPI cards, responsive line and bar charts, and a sortable, searchable, paginated orders table with a confirmation-guarded destructive action, alongside a typed user settings form.

Each line follows `type positional... key=value flag "Text" @data #id ~variant -> action`: `@` binds data, `#` assigns a unique element ID, `~` selects a visual variant, and `->` wires navigation (`/path`) or an action handler (`api.fn`).

### CLI Commands

Run commands via `node packages/cli/dist/bin.js <command>` from the repository root (or `tersa <command>` when `@tersa/cli` is linked):

```sh
# Scaffold app.tsa, agent rules, and an initial Next.js app in ./my-app/out
node packages/cli/dist/bin.js init my-app --name "My App"

# Validate one or more .tsa specs (exits 2 on spec errors)
node packages/cli/dist/bin.js check examples/dashboard/app.tsa

# Preview files that regeneration would add or change (exits 1 if changes exist)
node packages/cli/dist/bin.js diff examples/dashboard/app.tsa -o out/

# Compile a .tsa spec and write the Next.js app (defaults to ./out)
node packages/cli/dist/bin.js gen examples/dashboard/app.tsa -o out/
```

| Command                            | Description                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `tersa init [dir] [--name "App"]`  | Scaffold `app.tsa`, `CLAUDE.md`, `.cursor/rules/tersa.mdc`, `README.md`, and `out/` |
| `tersa check <file.tsa> [...]`     | Validate spec files and report diagnostics (exits `2` on spec errors)               |
| `tersa diff <file.tsa> [-o <dir>]` | Dry-run preview of files `gen` would add or modify (`-o` / `--out`, default `out/`) |
| `tersa gen <file.tsa> [-o <dir>]`  | Generate the Next.js App Router project (`-o` / `--out`, default `out/`)            |
| `tersa --help` / `tersa --version` | Display usage help or CLI version                                                   |

## Architecture

`tersa` is organized as a `pnpm` workspace monorepo under [`packages/`](packages):

| Package           | Path                                     | Role                                                                                                                  |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `@tersa/spec`     | [`packages/spec`](packages/spec)         | Grammar v0 tokenizer, parser, AST types, validator, diagnostics, and `compile()`                                      |
| `@tersa/themes`   | [`packages/themes`](packages/themes)     | W3C DTCG token presets (`aurora`, `ember`) compiled with Style Dictionary into CSS variables and Tailwind v4 `@theme` |
| `@tersa/gen-next` | [`packages/gen-next`](packages/gen-next) | Compiles a Tersa AST into Next.js App Router + Tailwind v4 + shadcn/ui source with protected edit slots               |
| `@tersa/cli`      | [`packages/cli`](packages/cli)           | Command-line interface (`init`, `check`, `diff`, `gen`)                                                               |

## Documentation

- [`docs/grammar.md`](docs/grammar.md) — Full grammar v0 specification, node types, data-binding shapes, protected edit slots, and CLI exit codes.
- [`docs/llms.txt`](docs/llms.txt) — Token-compact (<2k tokens) language and generator reference designed for coding agents.
- [`templates/agent/`](templates/agent) — Drop-in [`CLAUDE.md`](templates/agent/CLAUDE.md) instructions and Cursor rule ([`tersa.mdc`](templates/agent/tersa.mdc)) for generated projects.
- [`examples/dashboard/app.tsa`](examples/dashboard/app.tsa) — Reference dashboard and settings specification.
- [`docs/ci-policy.md`](docs/ci-policy.md) — CI workflow rules, required checks, and Node 20 / Node 22 verification matrix.

## Roadmap

- **M0**: Grammar v0, parser and validator, `tersa gen`, `aurora` theme, docs, CI.
- **M1** (current): `init`, `check`, `diff`, protected edit slots, `ember` theme, `lib/stubs.ts`, landing blocks (`hero`, `features`, `cta`).
- **M2**: Benchmark harness, shadcn registry integration, auth and CRUD patterns, visual tests.
- **M3**: Grammar freeze, editor syntax highlighting, MCP server, theme registry.

## Contributing

Branch from `beta` and target pull requests at `beta` (see [`AGENTS.md`](AGENTS.md) and [`docs/ci-policy.md`](docs/ci-policy.md)). Keep all code, examples, and commit metadata free of personal information.

```sh
pnpm install                          # Install workspace dependencies and build themes
pnpm format                           # Format repository files with Prettier
pnpm lint                             # Run ESLint and Prettier check
pnpm typecheck                        # Typecheck all packages with TypeScript
pnpm test                             # Run Vitest unit, snapshot, and integration suites
pnpm build                            # Build all workspace packages
pnpm verify:example                   # Generate example app, install, typecheck, and run next build
python3 scripts/pii-guard/pii_guard.py # Verify no personal info is present
```

Pull requests run formatting, linting, typechecking, tests, build, and `pii-guard` on Node 22; pushes to `beta` and `main` additionally run the full Node 20 / Node 22 matrix and `pnpm verify:example`.

## License

Licensed under the MIT License (`SPDX-License-Identifier: MIT`). See [`LICENSE`](LICENSE) for full text.
