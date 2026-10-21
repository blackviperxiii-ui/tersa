"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Field, Row } from "@/lib/types";
import { humanize } from "@/lib/utils";

interface Props {
  title?: string;
  fields: Field[];
  /** Initial values, keyed by field name. */
  initial?: Row;
  /** Name of the function in lib/api.ts that receives the values. */
  fn: string;
  submitLabel: string;
}

type Values = Record<string, string | boolean>;
type Status =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; text: string };

function initialValues(fields: Field[], initial?: Row): Values {
  const values: Values = {};
  for (const f of fields) {
    const given = initial?.[f.name];
    if (f.type === "checkbox") values[f.name] = typeof given === "boolean" ? given : false;
    else if (given !== undefined) values[f.name] = String(given);
    else values[f.name] = f.type === "select" ? (f.options?.[0] ?? "") : "";
  }
  return values;
}

export function FormView({ title, fields, initial, fn, submitLabel }: Props) {
  const [values, setValues] = useState<Values>(() => initialValues(fields, initial));
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function set(name: string, value: string | boolean) {
    setValues((v) => ({ ...v, [name]: value }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "saving" });
    try {
      const call = api[fn];
      if (!call) throw new Error(`api.${fn} is not implemented`);
      const payload: Record<string, string | number | boolean> = {};
      for (const f of fields) {
        const v = values[f.name] ?? "";
        payload[f.name] = f.type === "number" && typeof v === "string" && v !== "" ? Number(v) : v;
      }
      await call(payload);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const id = `field-${f.name}`;
            const value = values[f.name];
            if (f.type === "checkbox") {
              return (
                <div key={f.name} className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id={id}
                    type="checkbox"
                    checked={value === true}
                    onChange={(event) => set(f.name, event.target.checked)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  <Label htmlFor={id}>{humanize(f.name)}</Label>
                </div>
              );
            }
            return (
              <div
                key={f.name}
                className={f.type === "textarea" ? "grid gap-2 sm:col-span-2" : "grid gap-2"}
              >
                <Label htmlFor={id}>{humanize(f.name)}</Label>
                {f.type === "select" ? (
                  <Select
                    id={id}
                    value={String(value)}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {humanize(o)}
                      </option>
                    ))}
                  </Select>
                ) : f.type === "textarea" ? (
                  <Textarea
                    id={id}
                    value={String(value)}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                ) : (
                  <Input
                    id={id}
                    type={f.type}
                    value={String(value)}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="gap-4">
          <Button type="submit" disabled={status.kind === "saving"}>
            {status.kind === "saving" ? "Saving…" : submitLabel}
          </Button>
          <p
            role="status"
            className={
              status.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
            }
          >
            {status.kind === "saved" ? "Saved." : status.kind === "error" ? status.text : ""}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
