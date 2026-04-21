import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

type Item = { areaName: string; revenueCents: number };

const COLORS = ["var(--ion-color-primary)", "var(--ion-color-success)", "var(--ion-color-warning)", "var(--ion-color-danger)"];

export default function RevenueByAreaBarChart({ data, height = 240 }: { data: Item[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="areaName" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString("id-ID")}`} />
          <Bar dataKey="revenueCents">
            {data.map((_, i) => (
              <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
