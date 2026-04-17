"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function RevenueBySource({ data }: { data: { source: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="revenue" nameKey="source" label={({ name }) => name}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
