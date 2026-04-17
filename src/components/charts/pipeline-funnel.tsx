"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#f59e0b",
  qualified: "#22c55e",
  converted: "#8b5cf6",
  lost: "#ef4444",
};

export default function PipelineFunnel({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="stage" width={85} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLORS[d.stage] || "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
