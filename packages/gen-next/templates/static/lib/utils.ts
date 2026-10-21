import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export const formatMoney = (value: number) => money.format(value);
export const formatNumber = (value: number) => number.format(value);
export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function formatDate(value: string | number) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : date.format(d);
}

/** "firstName" and "first_name" both become "First name". */
export function humanize(key: string) {
  if (/^id$/i.test(key)) return "ID";
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
