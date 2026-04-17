"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function formatVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export default function RevenueByStore({ data }: { data: { store: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
        <XAxis type="number" tickFormatter={formatVnd} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="store" width={120} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="revenue" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
