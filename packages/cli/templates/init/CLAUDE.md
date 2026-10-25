# Tersa project

This app is generated from `app.tsa` by [tersa](https://github.com/blackviperxiii-ui/tersa).

## Rules

1. Read `app.tsa` first. It is the source of truth for pages, layout and data shapes.
2. To change structure, edit `app.tsa` and run `tersa gen app.tsa -o out`. Do not hand-edit
   generated layout in `app/*/page.tsx`; regeneration will overwrite it.
3. Put real logic in `lib/api.ts` and `lib/data.ts` inside `@tersa-slot begin custom` regions.
   Fetch placeholders live in `lib/stubs.ts`.
4. Use design tokens only: `bg-primary`, `text-muted-foreground`, `border-border`, `fill-chart-1`.
5. Run `tersa check app.tsa` before committing spec changes. Use `tersa diff` to preview regen.
6. Before finishing: `pnpm typecheck` and `pnpm build` must pass in `out/`.
