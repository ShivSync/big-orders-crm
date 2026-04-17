"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

export default function MonthlyTrend({ data }: { data: { month: string; leads: number; orders: number; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Leads" />
        <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Orders" />
      </LineChart>
    </ResponsiveContainer>
  );
}
