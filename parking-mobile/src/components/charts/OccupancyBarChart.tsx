import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from "recharts";

type Area = { areaName: string; occupied: number; capacity: number };

export default function OccupancyBarChart({ data, height = 200 }: { data: Area[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, (dataMax: number) => Math.max(100, dataMax)]} tickFormatter={(v) => `${v}`} />
          <YAxis type="category" dataKey="areaName" width={120} />
          <Tooltip formatter={(value: any, name: any, props: any) => {
            if (name === 'occupied') return [`${value}`, 'Occupied'];
            return [value, name];
          }} />
          <Bar dataKey="occupied" fill="var(--ion-color-primary)">
            <LabelList dataKey="occupied" position="right" formatter={(v: any) => `${v}`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
