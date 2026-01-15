// src/app/pro/results/components/charts/RoomMonthlyChart.tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { simulate } from "@/app/pro/lib/simulate";

// rechartsを動的インポート（起動時間を改善）
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const ComposedChart = dynamic(
  () => import("recharts").then((mod) => mod.ComposedChart),
  { ssr: false }
);
const Legend = dynamic(
  () => import("recharts").then((mod) => mod.Legend) as Promise<React.ComponentType<Record<string, unknown>>>,
  { ssr: false }
);
const Line = dynamic(
  () => import("recharts").then((mod) => mod.Line),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);

type SimResult = Awaited<ReturnType<typeof simulate>>;

type Props = {
  result: SimResult;
  metric: "revenue" | "expenses" | "profit";
};

const PALETTE = ["#4A90E2", "#FF9800", "#60B50A", "#8E44AD", "#00ACC1", "#EF5350"];

const fmtMan = (n: number) => {
  const value = Math.round((n || 0) / 10_000);
  return value === 0 ? "" : `${value}万`;
};

export default function RoomMonthlyChart({ result, metric }: Props) {
  const months = result.perRoomResults[0]?.monthlyRevenues.map((m) => m.month) ?? [];

  const data = useMemo(() => {
    return months.map((month, i) => {
      const out: Record<string, number> = { month };
      let total = 0;

      let totalRevenue = 0;
      let totalVariableExpenses = 0;

      result.perRoomResults.forEach((room) => {
        let value = 0;
        if (metric === "revenue") value = room.monthlyRevenues[i]?.totalRevenue ?? 0;
        if (metric === "expenses") value = room.monthlyExpenses[i]?.totalExpenses ?? 0;
        if (metric === "profit") {
          const rev = room.monthlyRevenues[i]?.totalRevenue ?? 0;
          const exp = room.monthlyExpenses[i]?.totalExpenses ?? 0;
          value = rev - exp; // 個別部屋は変動費のみ
        }
        const key = room.name || `部屋${room.capacity}-${room.area}`;
        out[key] = value;

        // 合計用の集計
        totalRevenue += room.monthlyRevenues[i]?.totalRevenue ?? 0;
        totalVariableExpenses += room.monthlyExpenses[i]?.totalExpenses ?? 0;
      });

      // 合計値は個別の部屋の値の合計として計算
      if (metric === "profit") {
        // 固定費を月単位で計算（期間全体の固定費を月数で割る）
        const totalMonths = result.perRoomResults[0]?.monthlyRevenues?.length || 1;
        const monthlyFixedExpenses =
          (result.breakdownPeriod?.buildingFixedTotal || 0) / totalMonths;
        total = totalRevenue - totalVariableExpenses - monthlyFixedExpenses;
      } else {
        total = metric === "revenue" ? totalRevenue : totalVariableExpenses;
      }

      out.合計 = total;
      return out;
    });
  }, [months, result.perRoomResults, metric, result.breakdownPeriod?.buildingFixedTotal]);

  const roomKeys = result.perRoomResults.map((r) => r.name || `部屋${r.capacity}-${r.area}`);

  return (
    <section className="w-full overflow-hidden rounded-2xl border bg-white p-4">
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmtMan} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload) return null;

                // 実際の合計値を計算（個別の部屋の値の合計）
                const actualTotal = payload
                  .filter((p) => p.name !== "合計")
                  .reduce((sum, p) => sum + (p.value as number), 0);

                return (
                  <div style={{ background: "#fff", borderRadius: 6, padding: 8 }}>
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>{label}</div>
                    {payload
                      .filter((p) => p.name !== "合計")
                      .map((p) => (
                        <div key={p.name} style={{ color: p.color }}>
                          {p.name}: {fmtMan(p.value as number)}
                        </div>
                      ))}
                    <div style={{ marginTop: 4, fontWeight: "bold" }}>
                      合計: {fmtMan(actualTotal)}
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              align="left"
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: "40px" }}
              content={() => (
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        backgroundColor: "#dddddd",
                        borderRadius: 2,
                      }}
                    />
                    <span style={{ color: "#000" }}>合計</span>
                  </span>

                  {roomKeys.map((key, i) => (
                    <span key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 12,
                          backgroundColor: PALETTE[i % PALETTE.length],
                          borderRadius: 2,
                        }}
                      />
                      <span style={{ color: "#000" }}>{key}</span>
                    </span>
                  ))}
                </div>
              )}
            />
            <Area type="monotone" dataKey="合計" stroke="transparent" fill="#dddddd" />
            {roomKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={4}
                dot={{ r: 5 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
