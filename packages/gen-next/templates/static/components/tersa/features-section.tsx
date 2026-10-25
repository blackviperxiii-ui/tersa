import { EmptyState } from "@/components/tersa/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Row } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FeaturesSection({
  title,
  items,
  cols = 3,
  id,
}: {
  title?: string;
  items: Row[];
  cols?: number;
  id?: string;
}) {
  if (!items.length) {
    return <EmptyState title="No features yet" description="Add items to the bound list." />;
  }
  const grid =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : cols === 4
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <section id={id} className="space-y-6">
      {title ? <h2 className="text-2xl font-semibold tracking-tight">{title}</h2> : null}
      <div className={cn("grid gap-4", grid)}>
        {items.map((item, i) => {
          const titleText = String(item.title ?? item.name ?? `Feature ${i + 1}`);
          const body = String(item.description ?? item.body ?? item.summary ?? "");
          return (
            <Card key={i} className="h-full">
              <CardHeader>
                <CardTitle className="text-base">{titleText}</CardTitle>
              </CardHeader>
              {body ? (
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{body}</p>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
