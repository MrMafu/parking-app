import React from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

export default function Sparkline({ data, color = "var(--ion-color-primary)", height = 48 }: { data: Array<{ date: string; value: number }>; color?: string; height?: number }) {
  return (
    <div style={{ width: 120, height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
