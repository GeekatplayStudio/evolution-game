"use client";

import { cn } from "@/lib/utils";

interface TrendChartProps {
  title: string;
  subtitle: string;
  values: number[];
  colorClassName: string;
  stroke: string;
  fill: string;
  formatter?: (value: number) => string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function TrendChart({
  title,
  subtitle,
  values,
  colorClassName,
  stroke,
  fill,
  formatter = (value) => value.toFixed(1),
}: TrendChartProps) {
  const width = 240;
  const height = 84;
  const safeValues = values.length > 1 ? values : [...values, ...values];
  const min = Math.min(...safeValues, 0);
  const max = Math.max(...safeValues, 1);
  const range = max - min || 1;

  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * (width - 12) + 6;
    const y = height - ((value - min) / range) * (height - 16) - 8;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(2)},${(height - 6).toFixed(2)} L ${points[0]?.x.toFixed(2)},${(height - 6).toFixed(2)} Z`;
  const current = safeValues[safeValues.length - 1] ?? 0;
  const previous = safeValues[safeValues.length - 2] ?? current;
  const delta = current - previous;
  const deltaLabel = `${delta >= 0 ? "+" : ""}${formatter(delta)}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-100">{formatter(current)}</p>
          <p className={cn("text-[10px] uppercase tracking-[0.16em]", colorClassName)}>{deltaLabel}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-24 w-full overflow-visible">
        <defs>
          <linearGradient id={`trend-fill-${title}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.48" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.2, 0.45, 0.7].map((stop, index) => (
          <line
            key={stop}
            x1="6"
            x2={width - 6}
            y1={clamp(height - stop * (height - 16) - 8, 0, height)}
            y2={clamp(height - stop * (height - 16) - 8, 0, height)}
            stroke="rgba(148,163,184,0.18)"
            strokeDasharray={index === 1 ? "0" : "4 4"}
          />
        ))}
        <path d={areaPath} fill={`url(#trend-fill-${title})`} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 4.5 : 2.25}
            fill={index === points.length - 1 ? stroke : "rgba(226,232,240,0.68)"}
            stroke="rgba(15,23,42,0.95)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}
