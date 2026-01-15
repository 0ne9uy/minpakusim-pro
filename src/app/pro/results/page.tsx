"use client";

/* ===========================
   結果ページ（一次計算→期間スライス→再集計）
   - 36ヶ月を一度だけ simulate
   - ユーザーの選択レンジで月次をスライス
   - 合計を再集計して結果コンポーネントに渡す
   =========================== */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { simulate } from "@/app/pro/lib/simulate";
import type { FormValues, RoomType } from "@/app/pro/lib/types";
import MetricView from "./components/charts/MetricView";
import PlanControls from "./components/PlanControls";
import PlanHeader from "./components/PlanHeader";
import SimulationResults from "./components/SimulationResults";

/* 月差（from→to, 月初基準） */
function diffMonths(from: Date, to: Date) {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  );
}

type Tab = "overview" | "sales" | "expenses" | "profit";
type Metric = "revenue" | "expenses" | "profit";
type RoomFilter = "total" | `room-${number}`;

const TAB_TO_METRIC: Record<Exclude<Tab, "overview">, Metric> = {
  sales: "revenue",
  expenses: "expenses",
  profit: "profit",
};

function ResultsPageContent() {
  const router = useRouter();

  /* -------------------------------------------
   * 入力データ（localStorage）
   * ----------------------------------------- */
  const [facility, setFacility] = useState<FormValues | null>(null);
  useEffect(() => {
    // ソースページを確認して適切なキーからデータを読み取る
    const sourcePage = localStorage.getItem("proSourcePage") || "new";
    const storageKey = sourcePage === "existing" ? "proData-existing" : "proData-new";
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      setFacility(JSON.parse(raw) as FormValues);
    } catch {
      setFacility(null);
    }
  }, []);

  /* -------------------------------------------
   * 36ヶ月のフル計算レンジ
   * - 基準: submittedAt があればその月、なければ今月
   * ----------------------------------------- */
  const submittedAt = useMemo(() => {
    const raw = (facility as any)?.submittedAt;
    const d = raw ? new Date(raw) : new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }, [facility]);

  const minStart = useMemo(() => submittedAt, [submittedAt]);
  const maxEnd = useMemo(() => {
    const d = new Date(minStart);
    d.setUTCMonth(d.getUTCMonth() + 35); /* 含めて36ヶ月 */
    return d;
  }, [minStart]);

  /* -------------------------------------------
   * simulate（1回のみ）
   * ----------------------------------------- */
  const [fullData, setFullData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!facility) return;
      setLoading(true);
      setError(null);
      try {
        const rooms: RoomType[] = facility.roomTypes ?? [];
        const fullMonths = diffMonths(minStart, maxEnd) + 1; /* 両端含む */
        const data = await simulate(facility, rooms, {
          startDate: minStart,
          months: fullMonths,
        });
        (data as any).meta = {
          startDateISO: minStart.toISOString(),
          months: fullMonths,
        };
        setFullData(data);
      } catch (e: any) {
        setError(e?.message ?? "simulate error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [facility, minStart, maxEnd]);

  /* -------------------------------------------
   * ユーザー選択レンジ（初期: 12ヶ月）
   * ----------------------------------------- */
  const [startDate, setStartDate] = useState<Date>(minStart);
  const [months, setMonths] = useState<number>(12);

  const endDate = useMemo(() => {
    const d = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    d.setUTCMonth(d.getUTCMonth() + (months - 1));
    return d;
  }, [startDate, months]);

  /* -------------------------------------------
   * スライス＋再集計
   * ----------------------------------------- */
  const sliced = useMemo(() => {
    if (!fullData) return null;

    const fullStart = new Date(fullData.meta.startDateISO);
    const startIndex = diffMonths(fullStart, startDate);
    const endIndexExcl = diffMonths(fullStart, endDate) + 1; /* 非包含 */
    const monthsLen = endIndexExcl - startIndex;

    const slice = (arr: any[]) => arr.slice(startIndex, endIndexExcl);

    /* 部屋タイプ別の再集計 */
    const perRoomResults = fullData.perRoomResults.map((r: any) => {
      const monthlyRevenues = slice(r.monthlyRevenues);
      const monthlyExpenses = slice(r.monthlyExpenses);

      const revenue = Math.round(
        monthlyRevenues.reduce((s: number, m: any) => s + (m.totalRevenue ?? 0), 0),
      );
      const expenses = Math.round(
        monthlyExpenses.reduce((s: number, m: any) => s + (m.totalExpenses ?? 0), 0),
      );

      return {
        ...r,
        monthlyRevenues,
        monthlyExpenses,
        revenue,
        expenses,
        profit: Math.round(revenue - expenses),
      };
    });

    /* 固定費の月当たり推定 → 期間合計 */
    const baseMonths = fullData.breakdownPeriod.months || fullData.meta.months;
    const perMonthFixed = {
      trash: (fullData.breakdownPeriod.trash ?? 0) / baseMonths,
      rent: (fullData.breakdownPeriod.rent ?? 0) / baseMonths,
      internet: (fullData.breakdownPeriod.internet ?? 0) / baseMonths,
      system: (fullData.breakdownPeriod.system ?? 0) / baseMonths,
      tablet: (fullData.breakdownPeriod.tablet ?? 0) / baseMonths,
    };

    const consumables = perRoomResults.reduce((sum: number, r: any) => {
      return (
        sum + r.monthlyExpenses.reduce((ss: number, m: any) => ss + (m.consumablesCost ?? 0), 0)
      );
    }, 0);

    const buildingFixedTotal =
      (perMonthFixed.trash +
        perMonthFixed.rent +
        perMonthFixed.internet +
        perMonthFixed.system +
        perMonthFixed.tablet) *
      monthsLen;

    const totalRevenue = perRoomResults.reduce((s: number, r: any) => s + r.revenue, 0);
    const roomTypeExpenses = perRoomResults.reduce((s: number, r: any) => s + r.expenses, 0);
    const totalExpenses = Math.round(roomTypeExpenses + buildingFixedTotal);
    const profit = Math.round(totalRevenue - totalExpenses);

    /* 稼働率の計算を修正 */
    // 稼働率は表示しないか、正しい計算に修正する
    // 現在の計算は間違っているため、一時的に0%に設定
    const occupancyRate = 0;

    const breakdownPeriod = {
      months: monthsLen,
      trash: Math.round(perMonthFixed.trash * monthsLen),
      rent: Math.round(perMonthFixed.rent * monthsLen),
      internet: Math.round(perMonthFixed.internet * monthsLen),
      system: Math.round(perMonthFixed.system * monthsLen),
      tablet: Math.round(perMonthFixed.tablet * monthsLen),
      consumables: Math.round(consumables),
      buildingFixedTotal: Math.round(buildingFixedTotal),
    };

    return {
      ...fullData,
      perRoomResults,
      totalResults: {
        totalRevenue: Math.round(totalRevenue),
        totalExpenses,
        profit,
        occupancyRate,
      },
      breakdownPeriod,
    };
  }, [fullData, startDate, endDate, facility]);

  /* -------------------------------------------
   * タブと描画
   * ----------------------------------------- */
  const search = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("total");

  // URLパラメータからタブを初期化
  useEffect(() => {
    const urlTab = (search.get("tab") as Tab) || "overview";
    setActiveTab(urlTab);
  }, [search]);

  const metric = TAB_TO_METRIC[activeTab as Exclude<Tab, "overview">];

  if (!facility) return <p className="p-6 text-gray-500">proData がありません。</p>;
  if (loading) return <p className="p-6 text-gray-500">計算中…</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!sliced) return null;

  return (
    <div className="w-full overflow-y-scroll pt-30 pr-8">
      {/* プランヘッダー */}
      <PlanHeader
        name={facility.planName ?? ""}
        onNameChange={(next) => {
          const updated = { ...facility, planName: next };
          const sourcePage = localStorage.getItem("proSourcePage") || "new";
          const storageKey = sourcePage === "existing" ? "proData-existing" : "proData-new";
          localStorage.setItem(storageKey, JSON.stringify(updated));
          setFacility(updated);
        }}
        onEditRoomTypes={() => {
          // 元のページに戻る
          const sourcePage = localStorage.getItem("proSourcePage");
          if (sourcePage === "new") {
            router.push("/pro/new");
          } else if (sourcePage === "existing") {
            router.push("/pro/existing");
          } else if (sourcePage === "import") {
            router.push("/pro/import");
          } else {
            // デフォルトは新規作成ページ
            router.push("/pro/new");
          }
        }}
        period={{
          year: startDate.getUTCFullYear(),
          startMonth: startDate.getUTCMonth() + 1,
          endMonth: endDate.getUTCMonth() + 1,
          endYear: endDate.getUTCFullYear(),
          monthsLen: diffMonths(startDate, endDate) + 1,
        }}
        min={{ y: minStart.getUTCFullYear(), m: minStart.getUTCMonth() + 1 }}
        max={{ y: maxEnd.getUTCFullYear(), m: maxEnd.getUTCMonth() + 1 }}
        onPeriodChange={({ year, startMonth, endMonth, endYear }) => {
          const s = new Date(Date.UTC(year, startMonth - 1, 1));
          const e = new Date(Date.UTC(endYear ?? year, endMonth - 1, 1));
          const len = diffMonths(s, e) + 1;
          setStartDate(s);
          setMonths(Math.max(1, Math.min(36, len)));
        }}
      />

      {/* プランコントロール（タブとCSVボタン） */}
      <PlanControls
        facility={facility}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        roomFilter={roomFilter}
        onRoomFilterChange={setRoomFilter}
        perRoomResults={sliced.perRoomResults}
      />

      {/* コンテンツ表示 */}
      {activeTab === "overview" ? (
        <SimulationResults result={sliced} roomFilter={roomFilter} />
      ) : (
        <MetricView result={sliced} metric={metric} />
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">読み込み中...</div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
