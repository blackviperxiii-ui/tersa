import type { Row } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface ChartProps {
  data: Row[];
  x: string;
  y: string;
}

const W = 600;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

/** Rounds up to a "nice" axis maximum: 1, 2, 2.5, 5 or 10 times a power of ten. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function prepare(data: Row[], x: string, y: string) {
  const values = data.map((row) => Number(row[y]) || 0);
  const labels = data.map((row) => String(row[x] ?? ""));
  const max = niceMax(Math.max(0, ...values));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const py = (v: number) => PAD.top + INNER_H - (v / max) * INNER_H;
  return { values, labels, ticks, py };
}

function Axes({
  ticks,
  py,
  labels,
  xAt,
}: {
  ticks: number[];
  py: (v: number) => number;
  labels: string[];
  xAt: (i: number) => number;
}) {
  const every = Math.max(1, Math.ceil(labels.length / 6));
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={py(t)}
            y2={py(t)}
            className="stroke-border"
            strokeDasharray={t === 0 ? undefined : "3 3"}
          />
          <text
            x={PAD.left - 8}
            y={py(t)}
            dy="0.32em"
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            {formatNumber(t)}
          </text>
        </g>
      ))}
      {labels.map((label, i) =>
        i % every === 0 ? (
          <text
            key={`${label}-${i}`}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {label}
          </text>
        ) : null,
      )}
    </g>
  );
}

export function LineChart({ data, x, y }: ChartProps) {
  const { values, labels, ticks, py } = prepare(data, x, y);
  const xAt = (i: number) =>
    PAD.left + (values.length === 1 ? INNER_W / 2 : (i / (values.length - 1)) * INNER_W);
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${py(v).toFixed(1)}`)
    .join(" ");
  const base = PAD.top + INNER_H;
  const area = `${line} L${xAt(values.length - 1).toFixed(1)} ${base} L${xAt(0).toFixed(1)} ${base} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${y} by ${x}`} className="h-auto w-full">
      <Axes ticks={ticks} py={py} labels={labels} xAt={xAt} />
      <path d={area} className="fill-chart-1/10" />
      <path
        d={line}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-chart-1"
      />
      {values.map((v, i) => (
        <circle
          key={`${labels[i]}-${i}`}
          cx={xAt(i)}
          cy={py(v)}
          r={3}
          strokeWidth={2}
          className="fill-card stroke-chart-1"
        >
          <title>{`${labels[i]}: ${formatNumber(v)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function BarChart({ data, x, y }: ChartProps) {
  const { values, labels, ticks, py } = prepare(data, x, y);
  const slot = INNER_W / values.length;
  const barW = Math.min(40, slot * 0.6);
  const xAt = (i: number) => PAD.left + slot * i + slot / 2;
  const base = PAD.top + INNER_H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${y} by ${x}`} className="h-auto w-full">
      <Axes ticks={ticks} py={py} labels={labels} xAt={xAt} />
      {values.map((v, i) => (
        <rect
          key={`${labels[i]}-${i}`}
          x={xAt(i) - barW / 2}
          y={py(v)}
          width={barW}
          height={Math.max(0, base - py(v))}
          rx={3}
          className="fill-chart-2"
        >
          <title>{`${labels[i]}: ${formatNumber(v)}`}</title>
        </rect>
      ))}
    </svg>
  );
}
