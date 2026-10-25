import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CtaSection({
  title,
  subtitle,
  actions,
  id,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-10 sm:px-10"
    >
      <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
