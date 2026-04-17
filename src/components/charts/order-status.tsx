"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS: Record<string, string> = {
  draft: "#9ca3af",
  confirmed: "#3b82f6",
  preparing: "#f59e0b",
  ready: "#22c55e",
  fulfilled: "#8b5cf6",
  cancelled: "#ef4444",
};

export default function OrderStatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLORS[d.status] || "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
