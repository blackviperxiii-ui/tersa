import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HeroSection({
  title,
  subtitle,
  align = "center",
  actions,
  id,
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  actions?: ReactNode;
  id?: string;
}) {
  const centered = align === "center";
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border border-border bg-card px-6 py-12 shadow-sm sm:px-10 sm:py-16",
        centered && "text-center",
      )}
    >
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg",
            centered && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      ) : null}
      {actions ? (
        <div
          className={cn("mt-8 flex flex-wrap gap-3", centered ? "justify-center" : "justify-start")}
        >
          {actions}
        </div>
      ) : null}
    </section>
  );
}
