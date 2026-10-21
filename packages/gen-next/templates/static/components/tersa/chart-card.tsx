import { BarChart, LineChart } from "@/components/tersa/charts";
import { EmptyState } from "@/components/tersa/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Row } from "@/lib/types";

interface Props {
  kind: "line" | "bar";
  data: Row[];
  x: string;
  y: string;
  title?: string;
}

export function ChartCard({ kind, data, x, y, title }: Props) {
  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
        {data.length === 0 ? (
          <EmptyState title="No data yet" description="Nothing to plot for this period." />
        ) : kind === "line" ? (
          <LineChart data={data} x={x} y={y} />
        ) : (
          <BarChart data={data} x={x} y={y} />
        )}
      </CardContent>
    </Card>
  );
}
