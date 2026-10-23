"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { humanize } from "@/components/ui-kit";

// One validated hue (--chart-1: light and dark steps checked with the dataviz validator, 2026-10-23).
const INK = "hsl(var(--chart-1))";
const GRID = "hsl(var(--border))";
const MUTED = "hsl(var(--muted-foreground))";

const dayFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short" });
const parseDay = (d: string) => new Date(`${d}T00:00:00`);

function TipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-sm">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="font-semibold tabular text-foreground">{value}</p>
    </div>
  );
}

/** New leads per day: one series, so no legend; the card title names it. Crosshair tooltip on hover. */
export function LeadTrendChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure aria-label={`New leads per day: ${total} in ${data.length} days`} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            {/* A flat 12% wash under the line, not a colour gradient. */}
            <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={INK} stopOpacity={0.12} />
              <stop offset="1" stopColor={INK} stopOpacity={0.12} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => dayFmt.format(parseDay(d))}
            tick={{ fill: MUTED, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: MUTED, strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox
                  title={longDayFmt.format(parseDay(String(payload[0].payload.day)))}
                  value={`${payload[0].value} new lead${payload[0].value === 1 ? "" : "s"}`}
                />
              ) : null
            }
          />
          <Area isAnimationActive={false} type="monotone" dataKey="count" stroke={INK} strokeWidth={2} fill="url(#leadFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Leads by source: magnitude in one hue, sorted, values labelled at the bar end. */
export function SourceBars({ data }: { data: Array<{ source: string; count: number }> }) {
  const rows = data.map((d) => ({ ...d, label: humanize(d.source) }));
  return (
    <figure aria-label="Leads by source" style={{ height: Math.max(120, rows.length * 40 + 16) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={110} tick={{ fill: MUTED, fontSize: 13 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={({ active, payload }) =>
              active && payload?.length ? <TipBox title={String(payload[0].payload.label)} value={`${payload[0].value} leads`} /> : null
            }
          />
          <Bar
            isAnimationActive={false}
            dataKey="count"
            fill={INK}
            radius={[0, 4, 4, 0]}
            label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 12 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
