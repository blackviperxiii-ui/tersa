"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavPage {
  path: string;
  title: string;
}

interface Props {
  appName: string;
  nav: "sidebar" | "top" | "none";
  pages: NavPage[];
  children: ReactNode;
}

function NavLinks({
  pages,
  orientation,
}: {
  pages: NavPage[];
  orientation: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex gap-1",
        orientation === "vertical" ? "flex-col" : "items-center overflow-x-auto",
      )}
    >
      {pages.map((page) => {
        const active =
          pathname === page.path || (page.path !== "/" && pathname.startsWith(`${page.path}/`));
        return (
          <Link
            key={page.path}
            href={page.path}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            {page.title}
          </Link>
        );
      })}
    </nav>
  );
}

function Main({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </main>
  );
}

export function AppShell({ appName, nav, pages, children }: Props) {
  const brand = <span className="text-base font-semibold tracking-tight">{appName}</span>;

  if (nav === "none") {
    return (
      <div className="flex min-h-screen flex-col">
        <Main>{children}</Main>
      </div>
    );
  }

  if (nav === "top") {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar/90 text-sidebar-foreground backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
            {brand}
            <NavLinks pages={pages} orientation="horizontal" />
          </div>
        </header>
        <Main>{children}</Main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-sidebar-border px-5">{brand}</div>
        <div className="p-3">
          <NavLinks pages={pages} orientation="vertical" />
        </div>
      </aside>
      <header className="border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <div className="mb-2">{brand}</div>
        <NavLinks pages={pages} orientation="horizontal" />
      </header>
      <Main>{children}</Main>
    </div>
  );
}
