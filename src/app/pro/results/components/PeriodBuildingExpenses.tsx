// src/app/pro/results/components/PeriodBuildingExpenses.tsx
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
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
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

/* 期間別の支出内訳データ型 */
type BreakdownPeriod = {
  trash: number; // ゴミ回収
  rent: number; // 家賃
  internet: number; // Wi-Fi費
  consumables: number; // 消耗品費
  system: number; // システム料金
  tablet: number; // チェックインタブレット
};

type Props = { data: BreakdownPeriod };

const fmtJPY = (n: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

export default function PeriodBuildingExpenses({ data }: Props) {
  const rows = [
    { name: "1. ゴミ回収", value: data.trash },
    { name: "2. 家賃", value: data.rent },
    { name: "3. Wi-Fi費", value: data.internet },
    { name: "4. 消耗品費", value: data.consumables },
    { name: "5. システム料金", value: data.system },
    { name: "6. チェックインタブレット", value: data.tablet },
  ];

  const BAR_HEIGHT = 28;
  const ROW_GAP = 8;
  const CHART_HEIGHT = rows.length * BAR_HEIGHT + (rows.length - 1) * ROW_GAP;

  return (
    <section className="h-max w-full rounded-2xl border bg-white p-10">
      <h3 className="mb-4 font-semibold text-2xl">総支出内訳</h3>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* 左列: 項目ラベル */}
        <ul className="space-y-[18px] md:space-y-0">
          {rows.map((r, i) => (
            <li
              key={r.name}
              className="flex items-center"
              style={{
                height: BAR_HEIGHT,
                marginBottom: i < rows.length - 1 ? ROW_GAP : 0,
              }}
            >
              {r.name}
            </li>
          ))}
        </ul>

        {/* 中央列: 金額 */}
        <ul className="hidden md:block">
          {rows.map((r, i) => (
            <li
              key={r.name}
              className="flex items-center justify-end text-gray-900"
              style={{
                height: BAR_HEIGHT,
                marginBottom: i < rows.length - 1 ? ROW_GAP : 0,
              }}
            >
              {fmtJPY(r.value)}
            </li>
          ))}
        </ul>

        {/* 右列: 棒グラフ */}
        <div className="w-full" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              barSize={BAR_HEIGHT}
              barCategoryGap={ROW_GAP}
              margin={{ top: 0, right: 6, bottom: 0, left: 6 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Bar
                dataKey="value"
                name="支出"
                fill="#E4E4E7"
                shape={(props: unknown) => {
                  const { x, y, width, height, fill } = props as { x: number; y: number; width: number; height: number; fill: string };
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} />
                      <line
                        x1={x}
                        y1={y + height}
                        x2={x + width}
                        y2={y + height}
                        stroke="#C33529"
                        strokeWidth={3}
                      />
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
