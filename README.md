# tersa

**Compact spec in, polished shadcn code out.** A token-minimizing spec layer for coding agents.

Write ten lines of `.tsa`, run `tersa gen`, and get a Next.js App Router + Tailwind v4 + shadcn/ui
app with mock data, loading and empty states, responsive layout and a design-token theme. The
output is plain source you own; tersa is a build-time generator, not a runtime renderer.

## Quickstart

```sh
git clone https://github.com/blackviperxiii-ui/tersa && cd tersa
pnpm install && pnpm build
node packages/cli/dist/bin.js gen examples/dashboard/app.tsa -o out/
cd out && pnpm install && pnpm dev
```

Open http://localhost:3000. Change `examples/dashboard/app.tsa`, run `gen` again.

## The example, in 10 lines

```
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

That compiles to two pages: a dashboard with four KPI cards, a line and a bar chart, a sortable,
searchable, paginated orders table with a confirm-guarded destructive action, plus a typed settings
form. Every page ships with a loading skeleton, empty states and an error boundary.

## Grammar

One node per line, indentation for nesting, `Type props "text"`, `@` binds data, `#` sets an id,
`~` sets a variant, `->` sets an action. Node types: `app page row grid card kpi chart table form
button text` (and `action` under a table). Errors come with file, line, column, a caret and a hint.

- [docs/llms.txt](docs/llms.txt): the whole language in under 2k tokens, for agents.
- [docs/grammar.md](docs/grammar.md): full reference.
- [templates/agent/](templates/agent/): a `CLAUDE.md` block and a Cursor rule (`tersa.mdc`) to drop
  into generated projects.

## Packages

| Package           | What it does                                                |
| ----------------- | ----------------------------------------------------------- |
| `@tersa/spec`     | Grammar v0 parser, AST types, validator, `compile()`        |
| `@tersa/gen-next` | AST → Next.js App Router + shadcn/ui source                 |
| `@tersa/themes`   | DTCG token presets (`aurora`, `ember`) via Style Dictionary |
| `@tersa/cli`      | `tersa init`, `check`, `diff`, `gen`                        |

## Development

```sh
pnpm install          # also builds themes
pnpm lint             # eslint + prettier
pnpm typecheck
pnpm test             # vitest: parser, validator, themes, cli, generator snapshots, integration
pnpm build
pnpm verify:example   # generate the example, install it, next build + typecheck
```

CI runs all of the above on Node 20 and 22.

## Roadmap

- **M0**: grammar v0, parser and validator, `tersa gen`, aurora theme, docs, CI.
- **M1** (this): `init`, `check`, `diff`, protected edit slots, `ember` theme, `lib/stubs.ts`, landing
  blocks (`hero`, `features`, `cta`).
- **M2**: benchmark harness, shadcn registry integration, auth and CRUD patterns, visual tests.
- **M3**: grammar freeze, editor syntax highlighting, MCP server, theme registry.

## License

MIT © Jeremy Strickland
