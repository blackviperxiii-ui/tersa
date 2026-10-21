# Tersa grammar v0

A `.tsa` file is a tree of nodes, one per line, nested by indentation. It compiles to a
Next.js App Router app. This document is the reference; `llms.txt` is the short version.

## Lines

```
type positional... key=value flag "Text" @data #id ~variant -> action   # comment
```

| Piece       | Meaning                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| `type`      | One of the node types below. Must be the first word.                       |
| positional  | Bare words the node expects in order, e.g. `line` for chart, `2` for grid. |
| `key=value` | Named prop. Quote values with spaces: `submit="Save changes"`.             |
| flag        | Bare word that switches something on: `dark`, `sort`, `search`, `confirm`. |
| `"Text"`    | Label, title or copy. Supports `\"` and `\n`. One per line.                |
| `@data`     | Data binding. Letters, digits, `_`; dots only on `kpi` (`@user.revenue`).  |
| `#id`       | Element id. Must be unique in the file.                                    |
| `~variant`  | Style variant; see each node.                                              |
| `-> target` | Action: `api.fn`, `api.fn(col, ...)` or `/path`.                           |
| `# comment` | `#` followed by whitespace starts a comment. `#id` (no space) is an id.    |

Modifiers can appear in any order after the type. Blank lines are ignored.

## Structure

- Indent with 2 spaces per level. Tabs are errors.
- The first node is `app`. `page` nodes are written at the top level after it (not indented).
- Everything else nests under a `page`, or under a container (`row`, `grid`, `card`).
- `action` nodes nest only under `table`.
- Leaves (`kpi`, `chart`, `table`, `form`, `button`, `text`, `action`) take no children, except `table`.

## Nodes

### app

```
app "Name" [theme=aurora] [dark] [nav=sidebar|top|none]
```

Defaults: `theme=aurora`, light mode, `nav=sidebar`. At least one page is required.

### page

```
page /path "Title"
```

Path starts with `/` and uses letters, digits, `-`, `_` and `/`. `/` is the root page; otherwise the
root redirects to the first page. Each page gets `page.tsx` and `loading.tsx`.

### row

```
row                      # horizontal flex wrap of its children
row kpi*4 @metrics       # 4 kpi cards from a list of { label, value, format, delta }
```

A repeating row takes no children and must bind a list. Count 1 to 12.

### grid

```
grid 3
```

Responsive grid, 1 to 6 columns, collapsing on small screens.

### card

```
card ["Title"]
```

A shadcn card wrapping its children.

### kpi

```
kpi @stats.revenue "Revenue" format=money
kpi @count
```

Binding is required. `@name` is a single number; `@record.field` reads a field from a record.
Label defaults to the humanized field name. Formats: `number` (default), `money`, `percent`.

### chart

```
chart line @revenue x=month y=total "Revenue"
chart bar @signups x=week
```

Kinds: `line`, `bar`. `@list` is required and `x=` is required; `y` defaults to `value`.
Rendered as responsive SVG using chart tokens.

### table

```
table @orders cols=id,customer,total:money,status:badge sort search page=20 "Orders"
  action "Refund" ~destructive -> api.refund(id) confirm
```

`cols` is required: `key` or `key:type` with types `text` (default), `number`, `money`, `badge`,
`date`, `email`. `sort` and `search` enable client-side sorting and filtering. `page` is the page
size (1 to 200, default 10). Actions must call an `api.` function; arguments must be column keys.
`confirm` opens a confirmation dialog first.

### form

```
form @user fields=name,email:email,plan:select(free|pro),bio:textarea,active:checkbox -> api.saveUser "Profile" submit="Save changes"
```

`fields` and an `api.` action are required. Field types: `text` (default), `email`, `number`,
`select(a|b|c)`, `textarea`, `checkbox`. `@record` provides initial values. The handler receives
`{ field: value }`.

### button

```
button "Export" ~outline -> api.export
button "Settings" ~ghost -> /settings
```

Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`.

### text

```
text "Welcome back" ~heading
text "Last synced 5 minutes ago" ~muted
```

Variants: `default`, `heading`, `muted`.

## Data bindings

Each `@name` is one of three shapes, and a name must keep one shape across the file:

| Shape  | Used by                       | Generated as             |
| ------ | ----------------------------- | ------------------------ |
| list   | `row kpi*N`, `chart`, `table` | `Row[]` or `KpiItem[]`   |
| record | `form`, `kpi @rec.field`      | object with those fields |
| item   | `kpi @name`                   | a number                 |

Mock data in `lib/data.ts` is generated from the column names, deterministically.

## Errors

Every problem is reported with file, line, column, the offending line with a caret, and a hint:

```
app.tsa:7:31 error[E_BAD_VALUE]: unknown column type "moneyy"
7 |   table @orders cols=id,total:moneyy
  |                               ^^^^^^
  = hint: did you mean "money"?
```

The parser collects all errors in one pass. `tersa gen` exits with code 2 on spec errors.
