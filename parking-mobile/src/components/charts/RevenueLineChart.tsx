import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Point = { date: string; revenueCents: number };

export default function RevenueLineChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  const formatted = (value: number) => {
    return `Rp ${Number(value).toLocaleString("id-ID")}`;
  };

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip formatter={(value: any) => formatted(value)} labelFormatter={(label) => label} />
          <Line type="monotone" dataKey="revenueCents" stroke="var(--ion-color-primary)" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
