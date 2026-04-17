"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function MiniMonthlyTrend({ data }: { data: { month: string; leads: number; orders: number; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
