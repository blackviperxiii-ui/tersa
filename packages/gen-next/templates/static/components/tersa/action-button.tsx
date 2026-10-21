"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { ButtonVariant } from "@/lib/types";

interface Props {
  label: string;
  variant?: ButtonVariant;
  /** Function in lib/api.ts to call on click. */
  fn?: string;
  /** Path to navigate to on click. */
  to?: string;
}

export function ActionButton({ label, variant = "default", fn, to }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (to) {
    return (
      <Link href={to} className={buttonVariants({ variant })}>
        {label}
      </Link>
    );
  }

  async function onClick() {
    if (!fn) return;
    setBusy(true);
    setError(null);
    try {
      const call = api[fn];
      if (!call) throw new Error(`api.${fn} is not implemented`);
      await call();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={variant} onClick={onClick} disabled={busy}>
        {busy ? "Working…" : label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
