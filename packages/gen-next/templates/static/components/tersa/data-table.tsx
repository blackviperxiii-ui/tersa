"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/tersa/confirm-dialog";
import { EmptyState } from "@/components/tersa/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Cell, Column, Row, RowAction } from "@/lib/types";
import { cn, formatDate, formatMoney, formatNumber, humanize } from "@/lib/utils";

interface Props {
  title?: string;
  data: Row[];
  cols: Column[];
  sort?: boolean;
  search?: boolean;
  pageSize: number;
  actions?: RowAction[];
}

type BadgeTone = "success" | "warning" | "destructive" | "secondary";

function badgeTone(value: string): BadgeTone {
  const v = value.toLowerCase();
  if (/(paid|active|success|complete|done|approved|pro|team)/.test(v)) return "success";
  if (/(pending|processing|trial|review|open)/.test(v)) return "warning";
  if (/(fail|error|overdue|cancel|reject|blocked)/.test(v)) return "destructive";
  return "secondary";
}

function renderCell(column: Column, value: Cell | undefined) {
  if (value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  switch (column.type) {
    case "money":
      return <span className="tabular-nums">{formatMoney(Number(value))}</span>;
    case "number":
      return <span className="tabular-nums">{formatNumber(Number(value))}</span>;
    case "badge":
      return <Badge variant={badgeTone(String(value))}>{humanize(String(value))}</Badge>;
    case "date":
      return <span>{formatDate(String(value))}</span>;
    case "email":
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          {String(value)}
        </a>
      );
    default:
      return <span>{String(value)}</span>;
  }
}

function compare(a: Cell | undefined, b: Cell | undefined) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), "en", { numeric: true });
}

export function DataTable({ title, data, cols, sort, search, pageSize, actions = [] }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ action: RowAction; row: Row } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? data.filter((row) =>
          cols.some((c) =>
            String(row[c.key] ?? "")
              .toLowerCase()
              .includes(q),
          ),
        )
      : data;
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => compare(a[sortKey], b[sortKey]) * dir);
    }
    return out;
  }, [data, cols, query, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * pageSize, (current + 1) * pageSize);
  const from = rows.length === 0 ? 0 : current * pageSize + 1;
  const to = Math.min(rows.length, (current + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function run(action: RowAction, row: Row) {
    setBusy(true);
    setMessage(null);
    try {
      const fn = api[action.fn];
      if (!fn) throw new Error(`api.${action.fn} is not implemented`);
      await fn(...action.args.map((arg) => row[arg]));
      setMessage({ kind: "ok", text: `${action.label} completed.` });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function trigger(action: RowAction, row: Row) {
    if (action.confirm) setPending({ action, row });
    else void run(action, row);
  }

  const hasActions = actions.length > 0;

  return (
    <Card>
      {title || search ? (
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title ? <CardTitle>{title}</CardTitle> : <span />}
          {search ? (
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder="Search…"
                aria-label="Search table"
                className="pl-9"
              />
            </div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="space-y-4">
        {message ? (
          <p
            role="status"
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              message.kind === "ok"
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10",
            )}
          >
            {message.text}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <EmptyState
            title={query ? "No matching results" : "Nothing here yet"}
            description={
              query ? "Try a different search term." : "Records will appear here once they exist."
            }
          />
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {cols.map((c) => (
                      <TableHead
                        key={c.key}
                        aria-sort={
                          sortKey === c.key
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={cn((c.type === "money" || c.type === "number") && "text-right")}
                      >
                        {sort ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                          >
                            {humanize(c.key)}
                            <ArrowUpDown className="size-3.5" aria-hidden="true" />
                          </button>
                        ) : (
                          humanize(c.key)
                        )}
                      </TableHead>
                    ))}
                    {hasActions ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((row, i) => (
                    <TableRow key={`${String(row[cols[0]?.key ?? ""])}-${current}-${i}`}>
                      {cols.map((c) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            (c.type === "money" || c.type === "number") && "text-right",
                          )}
                        >
                          {renderCell(c, row[c.key])}
                        </TableCell>
                      ))}
                      {hasActions ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {actions.map((action) => (
                              <Button
                                key={action.label}
                                size="sm"
                                variant={action.variant}
                                onClick={() => trigger(action, row)}
                                disabled={busy}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <p>
                {from}–{to} of {rows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Previous page"
                  onClick={() => setPage(current - 1)}
                  disabled={current === 0}
                >
                  <ChevronLeft />
                </Button>
                <span className="tabular-nums">
                  Page {current + 1} of {pageCount}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Next page"
                  onClick={() => setPage(current + 1)}
                  disabled={current >= pageCount - 1}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={pending !== null}
        title={pending ? `${pending.action.label}?` : ""}
        description="This action cannot be undone."
        confirmLabel={pending?.action.label ?? "Confirm"}
        destructive={pending?.action.variant === "destructive"}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void run(pending.action, pending.row);
        }}
      />
    </Card>
  );
}
