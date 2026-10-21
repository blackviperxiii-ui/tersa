# Tersa project

This app is generated from `app.tsa` by [tersa](https://github.com/blackviperxiii-ui/tersa).

## Rules

1. Read `app.tsa` first. It is the source of truth for pages, layout and data shapes.
2. To change structure, edit `app.tsa` and run `tersa gen app.tsa -o <dir>`. Do not hand-edit
   generated layout in `app/*/page.tsx`; regeneration will overwrite it.
3. Put real logic in `lib/api.ts` (actions) and `lib/data.ts` (data). These are the slots you own.
4. Use design tokens only: `bg-primary`, `text-muted-foreground`, `border-border`, `fill-chart-1`.
   Never raw hex, rgb or px values. Colors live in `app/globals.css`.
5. Keep loading and empty states. Every page has `loading.tsx`; tables and charts render an
   empty state when data is empty.
6. Before finishing: `pnpm typecheck` and `pnpm build` must pass.

## Grammar cheat sheet

```
app "Name" [theme=aurora] [dark] [nav=sidebar|top|none]
page /path "Title"
  row kpi*4 @metrics
  grid 2
    chart line|bar @list x=key [y=key] ["Title"]
  table @list cols=a,b:money,c:badge [sort] [search] [page=20]
    action "Label" [~destructive] -> api.fn(col) [confirm]
  form [@record] fields=a,b:email,c:select(x|y) -> api.fn
  card ["Title"] / kpi @data.field ["Label"] / button "Label" [-> api.fn | -> /path] / text "Copy"
```

Full reference: `node_modules/@tersa/cli/docs/grammar.md` or https://github.com/blackviperxiii-ui/tersa/blob/main/docs/grammar.md
