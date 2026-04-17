"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#3b82f6", "#eab308", "#22c55e", "#a855f7", "#6b7280"];

export default function MiniPipelineFunnel({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="stage" width={80} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
