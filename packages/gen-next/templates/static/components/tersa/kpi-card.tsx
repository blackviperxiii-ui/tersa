import { TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/tersa/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import type { KpiFormat, KpiItem } from "@/lib/types";
import { cn, formatMoney, formatNumber, formatPercent } from "@/lib/utils";

function formatValue(value: number, format: KpiFormat) {
  if (format === "money") return formatMoney(value);
  if (format === "percent") return formatPercent(value);
  return formatNumber(value);
}

export function KpiCard({ item }: { item: KpiItem }) {
  const delta = item.delta;
  const up = delta !== undefined && delta >= 0;
  return (
    <Card className="gap-2">
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{item.label}</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatValue(item.value, item.format)}
        </p>
        {delta !== undefined ? (
          <p
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              up ? "text-success" : "text-destructive",
            )}
          >
            {up ? (
              <TrendingUp className="size-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3.5" aria-hidden="true" />
            )}
            <span>
              {up ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
            <span className="font-normal text-muted-foreground">vs last period</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface RowProps {
  items: KpiItem[];
  /** Extra grid classes, e.g. "lg:grid-cols-4". */
  className?: string;
}

export function KpiRow({ items, className }: RowProps) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No metrics yet"
          description="Metrics will show up here once data arrives."
        />
      </Card>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}
