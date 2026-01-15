"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { getRoomDisplayName } from "@/lib/utils";

// rechartsを動的インポート（起動時間を改善）
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
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

type MonthlyRevenue = { month: string; totalRevenue: number };
type MonthlyExpense = { month: string; totalExpenses: number };
type RoomResult = {
  name?: string;
  capacity: number;
  area: number;
  count?: number;
  monthlyRevenues: MonthlyRevenue[];
  monthlyExpenses: MonthlyExpense[];
};

type SimResult = {
  totalResults: {
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    occupancyRate: number;
  };
  perRoomResults: RoomResult[];
  breakdownPeriod?: {
    months: number;
    buildingFixedTotal: number;
  };
};

type Mode = "total" | `room-${number}`;

type Props = {
  result: SimResult;
  labelTotal?: string;
  mode?: Mode;
};

const fmtJPY = (n: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const fmtJaLarge = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const v = Math.floor(Math.abs(n));
  const oku = Math.floor(v / 100_000_000);
  const man = Math.floor((v % 100_000_000) / 10_000);
  if (!oku && !man) return "￥0";
  return `￥${sign}${oku ? `${oku}億` : ""}${man ? `${man}万` : ""}`;
};

export default function SimulationPeriodChart({
  result,
  labelTotal = "全体",
  mode = "total",
}: Props) {
  const months = useMemo<string[]>(
    () => result.perRoomResults[0]?.monthlyRevenues.map((m) => m.month) ?? [],
    [result.perRoomResults],
  );

  const chartData = useMemo(() => {
    if (mode === "total") {
      // 固定費を月単位で計算
      const totalMonths = result.breakdownPeriod?.months || months.length;
      const monthlyFixedExpenses = (result.breakdownPeriod?.buildingFixedTotal || 0) / totalMonths;

      return months.map((month, i) => {
        const revenue = result.perRoomResults.reduce(
          (sum, r) => sum + (r.monthlyRevenues[i]?.totalRevenue ?? 0),
          0,
        );
        const variableExpenses = result.perRoomResults.reduce(
          (sum, r) => sum + (r.monthlyExpenses[i]?.totalExpenses ?? 0),
          0,
        );
        const totalExpenses = variableExpenses + monthlyFixedExpenses;
        return { month, revenue, expenses: totalExpenses, profit: revenue - totalExpenses };
      });
    } else {
      const idx = Number(mode.replace("room-", ""));
      const room = result.perRoomResults[idx];
      if (!room) return [];
      return room.monthlyRevenues.map((rev, i) => {
        const exp = room.monthlyExpenses[i];
        const revenue = rev.totalRevenue ?? 0;
        const expenses = exp?.totalExpenses ?? 0;
        // 個別部屋モードでは固定費は含めない（変動費のみ）
        return { month: rev.month, revenue, expenses, profit: revenue - expenses };
      });
    }
  }, [mode, months, result.perRoomResults, result.breakdownPeriod]);

  // KPI header values depend on selected tab
  const kpi = useMemo(() => {
    if (mode === "total") {
      const { totalRevenue, totalExpenses, profit } = result.totalResults;
      return { scopeLabel: labelTotal, revenue: totalRevenue, expenses: totalExpenses, profit };
    }
    const idx = Number(mode.replace("room-", ""));
    const room = result.perRoomResults[idx];
    if (!room) return { scopeLabel: labelTotal, revenue: 0, expenses: 0, profit: 0 };
    const revenue = room.monthlyRevenues.reduce((s, m) => s + (m.totalRevenue ?? 0), 0);
    const expenses = room.monthlyExpenses.reduce((s, m) => s + (m.totalExpenses ?? 0), 0);
    return {
      scopeLabel: getRoomDisplayName({
        name: room.name,
        roomArea: room.area,
        computedRooms: room.count,
        capacity: room.capacity
      }),
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  }, [mode, result.totalResults, result.perRoomResults, labelTotal]);

  return (
    <section className="mt-2 space-y-4">
      {/* KPI header + chart */}
      <div className="h-fit w-full space-y-8 overflow-hidden rounded-2xl border bg-white">
        <div className="flex w-fit overflow-hidden">
          {(
            [
              { key: "revenue", label: "総売上", value: kpi.revenue, color: "#4A90E2" },
              { key: "expenses", label: "総支出", value: kpi.expenses, color: "#FF9800" },
              { key: "profit", label: "総利益", value: kpi.profit, color: "#60B50A" },
            ] as const
          ).map((s) => (
            <div
              key={s.key}
              className="flex flex-1 flex-col justify-between px-10 py-5 text-white"
              style={{ backgroundColor: s.color }}
            >
              <p>
                {s.label}
                <span className="ml-2 text-xs opacity-90">（{kpi.scopeLabel}）</span>
              </p>
              <span className="block whitespace-nowrap font-medium text-3xl">
                {fmtJaLarge(s.value)}
              </span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" />
            <YAxis
              tickFormatter={(v) => {
                const value = Math.round(Number(v) / 10000);
                return value === 0 ? "" : `${value}万`;
              }}
            />
            <Tooltip
              formatter={(value) => fmtJPY(Number(value))}
              itemSorter={(item) => {
                const order: Record<string, number> = { revenue: 0, expenses: 1, profit: 2 };
                const key = item.dataKey?.toString() ?? "";
                return order[key] ?? 99;
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="総売上"
              dot={{ r: 5 }}
              stroke="#4A90E2"
              strokeWidth={4}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="総支出"
              dot={{ r: 5 }}
              stroke="#FF9800"
              strokeWidth={4}
            />
            <Line
              type="monotone"
              dataKey="profit"
              name="総利益"
              dot={{ r: 5 }}
              stroke="#60B50A"
              strokeWidth={4}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
