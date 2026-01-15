"use client";

import dynamic from "next/dynamic";

// rechartsを動的インポート（起動時間を改善）
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
);
const ReferenceLine = dynamic(
  () => import("recharts").then((mod) => mod.ReferenceLine) as Promise<React.ComponentType<Record<string, unknown>>>,
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

type TotalResults = {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
};
type SimResult = {
  totalResults: TotalResults;
};
type Props = {
  data: SimResult;
};

const fmtMan = (n: number) => {
  if (n >= 100_000_000) {
    const oku = Math.floor(n / 100_000_000);
    const man = Math.floor((n % 100_000_000) / 10_000);
    return man === 0 ? `${oku}億` : `${oku}億${man}万`;
  }
  return `${Math.floor(n / 10_000)}万`;
};

export default function ThreeYearsSummary({ data }: Props) {
  const base = data.totalResults;

  // 初年度の結果をベースに、成長率を適用して2年目・3年目を推計
  // 支出にも成長率を適用する理由：
  // - 運営委託費(20%)とOTA手数料(13%)は売上に連動する変動費
  // - 売上が成長すれば、これらの費用も比例して増加する
  const y1 = { label: "初年度", revenue: base.totalRevenue, expenses: base.totalExpenses };
  const y2 = {
    label: "2年目",
    revenue: base.totalRevenue * 1.1,
    expenses: base.totalExpenses * 1.1,
  };
  const y3 = {
    label: "3年目",
    revenue: base.totalRevenue * 1.15,
    expenses: base.totalExpenses * 1.15,
  };

  const rows = [y1, y2, y3].map((y) => ({
    year: y.label,
    revenue: Math.round(y.revenue),
    expenses: Math.round(y.expenses),
    profit: Math.round(y.revenue - y.expenses),
  }));

  const colors: Record<string, string> = {
    profit: "#60B50A",
    expenses: "#FF9800",
    revenue: "#4A90E2",
  };

  return (
    <section className="rounded-2xl border bg-white p-10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-2xl">年度別収支</h3>
        <div className="flex gap-4">
          {[
            { key: "profit", label: "利益" },
            { key: "expenses", label: "支出" },
            { key: "revenue", label: "売上" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-1">
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  backgroundColor: colors[item.key],
                  borderRadius: 2,
                }}
              />
              <span style={{ color: colors[item.key] }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-53 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={12} barCategoryGap="10%">
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v) => fmtMan(Number(v))} />

            <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
            <Tooltip
              formatter={(value, name) => {
                const colors: Record<string, string> = {
                  profit: "#60B50A",
                  expenses: "#FF9800",
                  revenue: "#4A90E2",
                };
                const nameStr = String(name);
                const color = colors[nameStr] || "#000";

                return [
                  <span key="label" style={{ color }}>
                    {`${nameStr}: ${fmtMan(Number(value))}`}
                  </span>,
                ];
              }}
              contentStyle={{
                borderRadius: "6px",
                backgroundColor: "#fff",
              }}
              labelStyle={{
                color: "#000",
              }}
            />
            <Bar
              dataKey="profit"
              name="利益"
              strokeWidth={2}
              stroke={colors.profit}
              fill="rgba(96,181,10,0.4)"
              maxBarSize={28}
            />
            <Bar
              dataKey="expenses"
              name="支出"
              strokeWidth={2}
              stroke={colors.expenses}
              fill="rgba(255,152,0,0.4)"
              maxBarSize={28}
            />
            <Bar
              dataKey="revenue"
              name="売上"
              strokeWidth={2}
              stroke={colors.revenue}
              fill="rgba(74,144,226,0.4)"
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
