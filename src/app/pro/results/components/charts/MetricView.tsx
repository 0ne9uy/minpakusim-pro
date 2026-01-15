"use client";

import { memo, useMemo } from "react";
import type { simulate } from "../../../lib/simulate";
import PeriodBuildingExpenses from "../PeriodBuildingExpenses";
import ThreeYearsSummary from "../ThreeYearsSummary";
import RoomPeriodChart from "./RoomPeriodChart";

type SimResult = Awaited<ReturnType<typeof simulate>>;
type Metric = "revenue" | "expenses" | "profit";

const fmtJPY = (n: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

/* メトリクスごとの表示設定 */
const METRIC_CONFIG: Record<
  Metric,
  {
    title: string;
    primaryLabel: string;
    primaryKey: "totalRevenue" | "totalExpenses" | "profit";
    secondaryLabel: string;
    secondaryKey: "totalRevenue" | "totalExpenses" | "profit";
    chartMetric: Metric;
    emphasizePositive?: boolean;
  }
> = {
  revenue: {
    title: "売上ビュー",
    primaryLabel: "期間売上",
    primaryKey: "totalRevenue",
    secondaryLabel: "期間利益",
    secondaryKey: "profit",
    chartMetric: "revenue",
    emphasizePositive: true,
  },
  expenses: {
    title: "支出ビュー",
    primaryLabel: "期間支出",
    primaryKey: "totalExpenses",
    secondaryLabel: "期間利益",
    secondaryKey: "profit",
    chartMetric: "expenses",
    emphasizePositive: true,
  },
  profit: {
    title: "利益ビュー",
    primaryLabel: "期間利益",
    primaryKey: "profit",
    secondaryLabel: "期間売上",
    secondaryKey: "totalRevenue",
    chartMetric: "profit",
    emphasizePositive: true,
  },
};

type Props = {
  result: SimResult;
  metric: Metric;
};

function MetricViewImpl({ result, metric }: Props) {
  const cfg = METRIC_CONFIG[metric];
  const { totalResults, perRoomResults, breakdownPeriod } = result;

  const headerLine = useMemo(() => {
    const main = fmtJPY(totalResults[cfg.primaryKey]);
    const sub = fmtJPY(totalResults[cfg.secondaryKey]);
    return { main, sub };
  }, [cfg.primaryKey, cfg.secondaryKey, totalResults]);

  /* 1部屋あたりの売上・支出・利益を計算 */
  const perRoomMetrics = useMemo(() => {
    return perRoomResults.map((r: any) => {
      // 1部屋あたりの清掃売上（期間全体）
      // ※ monthlyRevenues.cleaningRevenue は全部屋分なので、部屋数で割る
      const totalCleaningRevenue = r.monthlyRevenues.reduce(
        (sum: number, m: any) => sum + (m.cleaningRevenue ?? 0),
        0,
      );
      const perRoomCleaningRevenue = r.count > 0 ? totalCleaningRevenue / r.count : 0;

      // 1部屋あたりの宿泊売上（期間全体）
      const totalAccommodationRevenue = r.monthlyRevenues.reduce(
        (sum: number, m: any) => sum + (m.accommodationRevenue ?? 0),
        0,
      );
      const perRoomAccommodationRevenue = r.count > 0 ? totalAccommodationRevenue / r.count : 0;

      // 1部屋あたりの売上合計（期間全体）
      const perRoomTotalRevenue = perRoomAccommodationRevenue + perRoomCleaningRevenue;

      // 1部屋あたりの支出（期間全体）
      const perRoomTotalExpenses = r.count > 0 ? r.expenses / r.count : 0;

      // 1部屋あたりの運営委託費（期間全体）
      const perRoomOutsourcingFee = r.monthlyExpenses.reduce(
        (sum: number, m: any) => sum + (m.outsourcingFee ?? 0),
        0,
      );
      const perRoomOutsourcingFeePerRoom = r.count > 0 ? perRoomOutsourcingFee / r.count : 0;

      // 1部屋あたりのOTA手数料（期間全体）
      const perRoomOtaFee = r.monthlyExpenses.reduce(
        (sum: number, m: any) => sum + (m.otaFee ?? 0),
        0,
      );
      const perRoomOtaFeePerRoom = r.count > 0 ? perRoomOtaFee / r.count : 0;

      // 1部屋あたりの水道光熱費（期間全体）
      const perRoomWaterUtility = r.monthlyExpenses.reduce(
        (sum: number, m: any) => sum + (m.waterUtilityCost ?? 0),
        0,
      );
      const perRoomWaterUtilityPerRoom = r.count > 0 ? perRoomWaterUtility / r.count : 0;

      // 1部屋あたりの利益（期間全体）
      const perRoomProfit = r.count > 0 ? r.profit / r.count : 0;

      return {
        perRoomTotalRevenue,
        perRoomAccommodationRevenue,
        perRoomCleaningRevenue,
        perRoomTotalExpenses,
        perRoomOutsourcingFee: perRoomOutsourcingFeePerRoom,
        perRoomOtaFee: perRoomOtaFeePerRoom,
        perRoomWaterUtility: perRoomWaterUtilityPerRoom,
        perRoomProfit,
      };
    });
  }, [perRoomResults]);

  /* 総合行の1部屋あたり売上・支出・利益を計算 */
  const totalPerRoomMetrics = useMemo(() => {
    const totalRoomCount = perRoomResults.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);

    if (totalRoomCount === 0) {
      return {
        perRoomTotalRevenue: 0,
        perRoomAccommodationRevenue: 0,
        perRoomCleaningRevenue: 0,
        perRoomTotalExpenses: 0,
        perRoomOutsourcingFee: 0,
        perRoomOtaFee: 0,
        perRoomWaterUtility: 0,
        perRoomProfit: 0,
      };
    }

    // 全部屋タイプの1部屋あたり宿泊売上の加重平均
    const totalPerRoomAccommodation =
      perRoomResults.reduce((sum: number, r: any) => {
        const accommodation = r.monthlyRevenues.reduce(
          (s: number, m: any) => s + (m.accommodationRevenue ?? 0),
          0,
        );
        return sum + accommodation;
      }, 0) / totalRoomCount;

    // 全部屋タイプの1部屋あたり清掃売上の加重平均
    // ※ monthlyRevenues.cleaningRevenue は全部屋分なので、そのまま合計してから部屋数で割る
    const totalPerRoomCleaning =
      perRoomResults.reduce((sum: number, r: any) => {
        const cleaning = r.monthlyRevenues.reduce(
          (s: number, m: any) => s + (m.cleaningRevenue ?? 0),
          0,
        );
        return sum + cleaning;
      }, 0) / totalRoomCount;

    // 全部屋タイプの1部屋あたり支出の加重平均
    const totalPerRoomExpenses =
      perRoomResults.reduce((sum: number, r: any) => sum + r.expenses, 0) / totalRoomCount;

    // 全部屋タイプの1部屋あたり運営委託費の加重平均
    const totalPerRoomOutsourcingFee =
      perRoomResults.reduce((sum: number, r: any) => {
        const outsourcing = r.monthlyExpenses.reduce(
          (s: number, m: any) => s + (m.outsourcingFee ?? 0),
          0,
        );
        return sum + outsourcing;
      }, 0) / totalRoomCount;

    // 全部屋タイプの1部屋あたりOTA手数料の加重平均
    const totalPerRoomOtaFee =
      perRoomResults.reduce((sum: number, r: any) => {
        const ota = r.monthlyExpenses.reduce((s: number, m: any) => s + (m.otaFee ?? 0), 0);
        return sum + ota;
      }, 0) / totalRoomCount;

    // 全部屋タイプの1部屋あたり水道光熱費の加重平均
    const totalPerRoomWaterUtility =
      perRoomResults.reduce((sum: number, r: any) => {
        const water = r.monthlyExpenses.reduce(
          (s: number, m: any) => s + (m.waterUtilityCost ?? 0),
          0,
        );
        return sum + water;
      }, 0) / totalRoomCount;

    // 全部屋タイプの1部屋あたり利益の加重平均
    const totalPerRoomProfit =
      perRoomResults.reduce((sum: number, r: any) => sum + r.profit, 0) / totalRoomCount;

    return {
      perRoomTotalRevenue: totalPerRoomAccommodation + totalPerRoomCleaning,
      perRoomAccommodationRevenue: totalPerRoomAccommodation,
      perRoomCleaningRevenue: totalPerRoomCleaning,
      perRoomTotalExpenses: totalPerRoomExpenses,
      perRoomOutsourcingFee: totalPerRoomOutsourcingFee,
      perRoomOtaFee: totalPerRoomOtaFee,
      perRoomWaterUtility: totalPerRoomWaterUtility,
      perRoomProfit: totalPerRoomProfit,
    };
  }, [perRoomResults]);

  return (
    <section className="space-y-8">
      {/* 見出し */}
      <header className="grid gap-1">
        <h2 className="font-bold text-xl">{cfg.title}</h2>
        <p className="text-gray-500 text-sm">
          {cfg.primaryLabel}: {headerLine.main}／ {cfg.secondaryLabel}:{" "}
          <span
            className={
              cfg.emphasizePositive && totalResults.profit >= 0
                ? "text-emerald-600"
                : cfg.emphasizePositive && totalResults.profit < 0
                  ? "text-red-600"
                  : ""
            }
          >
            {headerLine.sub}
          </span>
        </p>
      </header>

      <RoomPeriodChart result={result} metric={cfg.chartMetric} />

      {/* テーブル */}
      <div className="overflow-x-auto">
        <div className="w-full min-w-[680px] overflow-hidden rounded-xl border bg-white px-10 py-7">
          {metric === "revenue" ? (
            <table className="w-full border-collapse">
              <thead className="h-15">
                <tr>
                  <th className="p-3 text-left">部屋タイプ</th>
                  <th className="p-3 text-right">売上</th>
                  <th className="p-3 text-right">1部屋売上</th>
                  <th className="p-3 text-right">1部屋宿泊売上</th>
                  <th className="p-3 text-right">1部屋清掃売上</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t">
                <tr className="bg-white/60">
                  <td className="p-3 font-medium">総合</td>
                  <td className="p-3 text-right">{fmtJPY(totalResults.totalRevenue)}</td>
                  <td className="p-3 text-right">
                    {fmtJPY(totalPerRoomMetrics.perRoomTotalRevenue)}
                  </td>
                  <td className="p-3 text-right">
                    {fmtJPY(totalPerRoomMetrics.perRoomAccommodationRevenue)}
                  </td>
                  <td className="p-3 text-right">
                    {fmtJPY(totalPerRoomMetrics.perRoomCleaningRevenue)}
                  </td>
                </tr>

                {perRoomResults.map((r: any, i: number) => {
                  const metrics = perRoomMetrics[i];
                  return (
                    <tr key={r.name || `${r.capacity}-${r.area}-${i}`}>
                      <td className="p-3">
                        {r.name || `部屋タイプ${String.fromCharCode(65 + i)}`}
                      </td>
                      <td className="p-3 text-right">{fmtJPY(r.revenue)}</td>
                      <td className="p-3 text-right">{fmtJPY(metrics.perRoomTotalRevenue)}</td>
                      <td className="p-3 text-right">
                        {fmtJPY(metrics.perRoomAccommodationRevenue)}
                      </td>
                      <td className="p-3 text-right">{fmtJPY(metrics.perRoomCleaningRevenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : metric === "expenses" ? (
            <table className="w-full border-collapse">
              <thead className="h-15">
                <tr>
                  <th className="p-3 text-left">部屋タイプ</th>
                  <th className="p-3 text-right">支出</th>
                  <th className="p-3 text-right">1部屋支出</th>
                  <th className="p-3 text-right">運営委託費</th>
                  <th className="p-3 text-right">OTA手数料</th>
                  <th className="p-3 text-right">水道光熱費</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t">
                <tr className="bg-white/60">
                  <td className="p-3 font-medium">総合</td>
                  <td className="p-3 text-right">{fmtJPY(totalResults.totalExpenses)}</td>
                  <td className="p-3 text-right">
                    {fmtJPY(totalPerRoomMetrics.perRoomTotalExpenses)}
                  </td>
                  <td className="p-3 text-right">
                    {fmtJPY(totalPerRoomMetrics.perRoomOutsourcingFee)}
                  </td>
                  <td className="p-3 text-right">{fmtJPY(totalPerRoomMetrics.perRoomOtaFee)}</td>
                  <td className="p-3 text-right">
                    {fmtJPY(totalPerRoomMetrics.perRoomWaterUtility)}
                  </td>
                </tr>

                {perRoomResults.map((r: any, i: number) => {
                  const metrics = perRoomMetrics[i];
                  return (
                    <tr key={r.name || `${r.capacity}-${r.area}-${i}`}>
                      <td className="p-3">
                        {r.name || `部屋タイプ${String.fromCharCode(65 + i)}`}
                      </td>
                      <td className="p-3 text-right">{fmtJPY(r.expenses)}</td>
                      <td className="p-3 text-right">{fmtJPY(metrics.perRoomTotalExpenses)}</td>
                      <td className="p-3 text-right">{fmtJPY(metrics.perRoomOutsourcingFee)}</td>
                      <td className="p-3 text-right">{fmtJPY(metrics.perRoomOtaFee)}</td>
                      <td className="p-3 text-right">{fmtJPY(metrics.perRoomWaterUtility)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse">
              <thead className="h-15">
                <tr>
                  <th className="p-3 text-left">部屋タイプ</th>
                  <th className="p-3 text-right">利益</th>
                  <th className="p-3 text-right">1部屋の利益</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t">
                <tr className="bg-white/60">
                  <td className="p-3 font-medium">総合</td>
                  <td className="p-3 text-right">
                    <span
                      className={totalResults.profit >= 0 ? "text-emerald-600" : "text-red-600"}
                    >
                      {fmtJPY(totalResults.profit)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className={
                        totalPerRoomMetrics.perRoomProfit >= 0 ? "text-emerald-600" : "text-red-600"
                      }
                    >
                      {fmtJPY(totalPerRoomMetrics.perRoomProfit)}
                    </span>
                  </td>
                </tr>

                {perRoomResults.map((r: any, i: number) => {
                  const metrics = perRoomMetrics[i];
                  return (
                    <tr key={r.name || `${r.capacity}-${r.area}-${i}`}>
                      <td className="p-3">
                        {r.name || `部屋タイプ${String.fromCharCode(65 + i)}`}
                      </td>
                      <td className="p-3 text-right">
                        <span className={r.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {fmtJPY(r.profit)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            metrics.perRoomProfit >= 0 ? "text-emerald-600" : "text-red-600"
                          }
                        >
                          {fmtJPY(metrics.perRoomProfit)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 3年サマリ + 固定費内訳 */}
      <div className="grid grid-cols-6 items-start gap-8">
        <div className="col-span-3">
          <ThreeYearsSummary data={result} />
        </div>
        <div className="col-span-3">
          <PeriodBuildingExpenses data={breakdownPeriod} />
        </div>
      </div>
    </section>
  );
}

const MetricView = memo(MetricViewImpl);
export default MetricView;
