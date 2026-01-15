import Papa from "papaparse";
import { prefectures } from "../lib/prefectures";
import type { FormValues, RoomType } from "../lib/types";

/* 月名リスト（1月〜12月） */
const MONTHS_JA = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

/* 定数 */
const OUTSOURCING_FEE_RATE = 0.2;
const OTA_FEE_RATE = 0.13;
const SYSTEM_FEE = 3960;
const CHECKIN_TABLET_COST = 9980;
const MINPAKU_LAW_MAX_DAYS = 180; // 民泊新法の年間稼働上限日数

/* 月の日数を取得 */
function getDaysInMonth(year: number, month1: number): number {
  // month1は1-12の範囲
  return new Date(year, month1, 0).getDate();
}

/* 数値正規化ユーティリティ */
const N = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* 県コードを日本語表記に解決 */
function resolvePrefJa(prefCode: string): string {
  const key = String(prefCode).trim().toLowerCase();
  return (prefectures[key] ?? prefCode).trim();
}

/* CSVをパースする */
function parseCsv<T = any>(csvText: string): T[] {
  return Papa.parse<T>(csvText, { header: true, skipEmptyLines: true }).data as T[];
}

/* 稼働日数テーブルを作成 */
function createWorkingDaysTable(workingDaysRows: any[]): Map<string, any> {
  const table = new Map<string, any>();
  workingDaysRows.forEach((row) => {
    const pref = row[""] || Object.values(row)[0];
    if (pref && pref !== "日数") table.set(String(pref).trim(), row);
  });
  return table;
}

/* 月次指数テーブルを作成 */
function createMonthlyIndexTable(indexRows: any[]): Map<string, any> {
  const table = new Map<string, any>();
  indexRows.forEach((row) => {
    const pref = row[""] || Object.values(row)[0];
    if (pref) table.set(String(pref).trim(), row);
  });
  return table;
}

/* 基本単価テーブルを作成 */
function createBasePriceTable(baseRows: any[], headerRow: string[]) {
  const table = new Map<string, Record<string, number>>();
  baseRows.forEach((row) => {
    const prefJa = row[""] || Object.values(row)[0];
    if (!prefJa) return;
    const rec: Record<string, number> = {};
    headerRow.forEach((h) => {
      if (!h || h === prefJa || h === "エリア" || h === "物価係数" || h === "1singleBP") return;
      rec[h] = N(row[h], NaN);
    });
    table.set(String(prefJa).trim(), rec);
  });
  return table as Map<string, Record<string, number>>;
}

/* 基本単価をテーブルから取得 */
function getBasePriceFromTable(
  basePriceTable: Map<string, Record<string, number>>,
  prefJa: string,
  capacity: number,
  beds: number | undefined,
): number {
  const row = basePriceTable.get(prefJa);
  if (!row) return 10000;
  if (capacity === 2) {
    const header = N(beds, 1) >= 2 ? "2ツイン" : "2ダブル";
    const v = row[header];
    if (Number.isFinite(v)) return v as number;
  }
  const v = row[String(capacity)];
  return Number.isFinite(v) ? (v as number) : 10000;
}

/* 築年数係数 */
type BuildingAgeRow = {
  ageRange: string;
  isRenewedFalse: string;
  isRenewedTrue: string;
};

function getBuildingAgeIndexFromRows(
  rows: BuildingAgeRow[],
  ageType: string | number,
  isRenewed: boolean,
): number {
  const key = String(ageType).trim();
  const row = rows.find((r) => String(r.ageRange).trim() === key);
  if (!row) return 1;
  return isRenewed ? N(row.isRenewedTrue, 1) : N(row.isRenewedFalse, 1);
}

/* ランク行 */
type RankRow = {
  minArea: string;
  maxArea: string;
  rank: string;
  waterutilityCost: string;
  minCapacity: string;
  maxCapacity: string;
};

/* 部屋面積に応じた水道光熱費を取得 */
function getWaterUtilityCostForRoom(rankRows: RankRow[], area: number): number {
  const row = rankRows.find((r) => N(r.minArea) <= area && area <= N(r.maxArea));
  return row ? N(row.waterutilityCost, 0) : 0;
}

/* シミュレーションオプション */
export type SimulateOptions = {
  startDate?: Date | string;
  months?: number;
  startMonth?: number;
  endMonth?: number;
  startYear?: number;
  endYear?: number;
};

/* 日付を正規化 */
function toDate(d?: Date | string): Date {
  if (!d) return new Date();
  if (d instanceof Date) return new Date(d.getTime());
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/* ウィンドウを日付から構築 */
function buildWindowFromDate(startBase: Date, months: number) {
  const out: { idx: number; year: number; month1: number; label: string }[] = [];
  const start = new Date(Date.UTC(startBase.getUTCFullYear(), startBase.getUTCMonth(), 1));
  for (let k = 0; k < months; k++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    d.setUTCMonth(start.getUTCMonth() + k);
    const year = d.getUTCFullYear();
    const month1 = d.getUTCMonth() + 1;
    const label = `${year % 100}年${month1}月`;
    out.push({ idx: k, year, month1, label });
  }
  return out;
}

/* レガシーウィンドウ構築 */
function buildWindowLegacy(sm: number, sy: number, months?: number, em?: number) {
  let len = months ?? (em ? ((em - sm + 12) % 12) + 1 : 12);
  len = Math.min(36, Math.max(1, len));
  const out: { idx: number; year: number; month1: number; label: string }[] = [];
  const start = new Date(Date.UTC(sy, sm - 1, 1));
  for (let k = 0; k < len; k++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    d.setUTCMonth(start.getUTCMonth() + k);
    const year = d.getUTCFullYear();
    const month1 = d.getUTCMonth() + 1;
    const label = `${year % 100}年${month1}月`;
    out.push({ idx: k, year, month1, label });
  }
  return out;
}

/* 売上成長率（売上と変動費に適用） */
function growthFactor(monthIndexFromStart: number): number {
  if (monthIndexFromStart >= 24) return 1.15;
  if (monthIndexFromStart >= 12) return 1.1;
  return 1.0;
}

/* 民泊新法適用時の稼働日数を計算（年間180日制限を適用） */
function calculateEffectiveWorkingDays(
  monthWindow: { idx: number; year: number; month1: number; label: string }[],
  workingDaysTable: Map<string, any>,
  prefJa: string,
  isLaw: boolean,
): Map<string, number> {
  const effectiveDays = new Map<string, number>();

  if (!isLaw) {
    // 民泊新法非適用: CSVの稼働日数をそのまま使用
    monthWindow.forEach(({ month1, label }) => {
      const monthKey = MONTHS_JA[month1 - 1];
      const days = N((workingDaysTable.get(prefJa) || {})[monthKey], 0);
      effectiveDays.set(label, days);
    });
    return effectiveDays;
  }

  // 民泊新法適用: 年間180日制限を適用
  // 年ごとにグループ化して180日を按分
  const yearGroups = new Map<number, { month1: number; label: string; rawDays: number }[]>();

  monthWindow.forEach(({ year, month1, label }) => {
    const monthKey = MONTHS_JA[month1 - 1];
    const rawDays = N((workingDaysTable.get(prefJa) || {})[monthKey], 0);

    if (!yearGroups.has(year)) {
      yearGroups.set(year, []);
    }
    yearGroups.get(year)!.push({ month1, label, rawDays });
  });

  // 各年の稼働日数を180日に制限
  yearGroups.forEach((months, year) => {
    const totalRawDays = months.reduce((sum, m) => sum + m.rawDays, 0);

    if (totalRawDays <= MINPAKU_LAW_MAX_DAYS) {
      // 180日以下ならそのまま
      months.forEach((m) => {
        effectiveDays.set(m.label, m.rawDays);
      });
    } else {
      // 180日を超える場合は按分
      // シミュレーション期間が1年未満の場合は、月数に応じて按分
      const monthsInYear = months.length;
      const annualLimit = Math.round((MINPAKU_LAW_MAX_DAYS / 12) * monthsInYear);
      const scaleFactor = Math.min(1, annualLimit / totalRawDays);

      months.forEach((m) => {
        const adjustedDays = Math.round(m.rawDays * scaleFactor);
        effectiveDays.set(m.label, adjustedDays);
      });
    }
  });

  return effectiveDays;
}

/* メインシミュレーション関数 */
export async function simulate(facility: FormValues, rooms: RoomType[], opts?: SimulateOptions) {
  console.log("🚀 === Pro版シミュレーション開始 ===");
  console.log("📋 施設情報:", {
    都道府県: facility.prefecture,
    家賃: facility.rent,
    築年数: facility.ageType,
    リノベーション: facility.isRenewed,
    民泊新法適用: facility.isLaw,
  });
  console.log(
    "🏠 部屋情報:",
    rooms.map((r) => ({
      名前: r.name,
      部屋数: r.computedRooms,
      定員: r.capacity,
      面積: r.roomArea,
      宿泊単価: r.lodgingUnitPrice,
    })),
  );

  /* データ取得 */
  const apiUrl = `/api/simulation-data?isLaw=${facility.isLaw}`;
  const [simRes] = await Promise.all([fetch(apiUrl)]);
  const {
    baseCsvText,
    workingDaysCsvText,
    indexCsvText,
    rankCsvText,
    expensesCsvText,
    buildingAgeData,
  } = await simRes.json();

  /* CSVパース */
  const baseRows = parseCsv(baseCsvText);
  const workingDaysRows = parseCsv(workingDaysCsvText);
  const indexRows = parseCsv(indexCsvText);
  const rankRows = parseCsv<RankRow>(rankCsvText);
  const buildingAgeRows = parseCsv<BuildingAgeRow>(buildingAgeData);
  const expensesRows = parseCsv(expensesCsvText);

  /* テーブル作成 */
  const headerRow = (Papa.parse(baseCsvText, { header: true }).meta.fields || []) as string[];
  const workingDaysTable = createWorkingDaysTable(workingDaysRows);
  const monthlyIndexTable = createMonthlyIndexTable(indexRows);
  const basePriceTable = createBasePriceTable(baseRows, headerRow);

  /* ウィンドウ構築 */
  let monthWindow: { idx: number; year: number; month1: number; label: string }[] = [];
  if (opts?.startMonth && opts?.startYear) {
    monthWindow = buildWindowLegacy(
      Math.min(12, Math.max(1, opts.startMonth)),
      opts.startYear,
      Math.min(36, Math.max(1, opts.months ?? 12)),
      opts.endMonth,
    );
  } else {
    const startBase = toDate(opts?.startDate ?? new Date());
    const months = Math.min(36, Math.max(1, opts?.months ?? 12));
    monthWindow = buildWindowFromDate(startBase, months);
  }
  const monthsLen = monthWindow.length;

  /* 基本データ */
  const BUILDING_AGE_INDEX = getBuildingAgeIndexFromRows(
    buildingAgeRows,
    facility.ageType as any,
    !!facility.isRenewed,
  );
  const RENT_COST = N(facility.rent, 0);
  const prefJa = resolvePrefJa(String(facility.prefecture));

  console.log("📊 基本係数:", {
    築年数係数: BUILDING_AGE_INDEX,
    家賃: RENT_COST,
    都道府県_日本語: prefJa,
  });

  const prefectureWorkingDays = workingDaysTable.get(prefJa) || {};
  const prefectureMonthlyIndex = monthlyIndexTable.get(prefJa) || {};

  // 民泊新法適用時の稼働日数制限を計算
  const effectiveWorkingDaysMap = calculateEffectiveWorkingDays(
    monthWindow,
    workingDaysTable,
    prefJa,
    !!facility.isLaw,
  );

  console.log("📅 稼働日数（サンプル）:", {
    "1月": prefectureWorkingDays["1月"],
    "7月": prefectureWorkingDays["7月"],
    "民泊新法適用": facility.isLaw ? "はい（180日/年制限）" : "いいえ",
  });
  console.log("📈 月次指数（サンプル）:", {
    "1月": prefectureMonthlyIndex["1月"],
    "7月": prefectureMonthlyIndex["7月"],
  });

  const fixedExpenseTable = new Map<number, { trash: number; internet: number }>();
  expensesRows.forEach((row) => {
    const key = N(row.rooms_count);
    fixedExpenseTable.set(key, { trash: N(row.trash), internet: N(row.internet) });
  });

  const counts = rooms.map((r) => Math.max(0, Math.floor(N(r.computedRooms, 0))));
  const totalRoomCount = counts.reduce((s, c) => s + c, 0);

  /* 部屋ごとの計算 */
  const perRoomResults = rooms.map((room, idxRoom) => {
    const roomCount = counts[idxRoom];
    const capacity = Math.max(1, Math.floor(N(room.capacity, 1)));
    const beds = Math.max(0, Math.floor(N(room.beds, 0)));

    const fromTable = getBasePriceFromTable(basePriceTable, prefJa, capacity, beds);
    const baseNightly =
      room.lodgingUnitPrice != null ? N(room.lodgingUnitPrice, fromTable) : fromTable;

    const avgStay = N(room.avgStayNights, 2.5) || 2.5;
    const cleaningUnit = N(room.cleaningUnitPrice, 0);
    const consumablesPerNight = N(room.consumablesPerNight, 0);

    const waterUnitPerMonth = getWaterUtilityCostForRoom(rankRows, N(room.roomArea, 0)) * roomCount;

    console.log(`\n🏠 部屋タイプ ${idxRoom + 1}: ${room.name}`);
    console.log("  基本情報:", {
      部屋数: roomCount,
      定員: capacity,
      ベッド数: beds,
      面積: room.roomArea,
    });
    console.log("  💰 入力された単価設定:");
    console.log(
      `    基準宿泊単価: ¥${baseNightly.toLocaleString()}${room.lodgingUnitPrice != null ? " (ユーザー入力)" : ` (テーブルから: ¥${fromTable.toLocaleString()})`}`,
    );
    console.log(`    清掃単価: ¥${cleaningUnit.toLocaleString()}`);
    console.log(`    消耗品単価/泊: ¥${consumablesPerNight.toLocaleString()}`);
    console.log(`    平均宿泊数: ${avgStay}泊`);
    console.log(`    水道光熱費（月額/全室）: ¥${waterUnitPerMonth.toLocaleString()}`);

    const monthlyRevenues: any[] = [];
    const monthlyExpenses: any[] = [];
    let sumRevenue = 0;
    let sumExpenses = 0;

    monthWindow.forEach(({ idx, month1, label }) => {
      const monthKey = MONTHS_JA[month1 - 1];
      // 民泊新法適用時は制限された稼働日数を使用
      const workingDays = effectiveWorkingDaysMap.get(label) ?? N(prefectureWorkingDays[monthKey], 0);
      const monthlyIndex = N(prefectureMonthlyIndex[monthKey], 1);

      const nightlyPrice = baseNightly * monthlyIndex * BUILDING_AGE_INDEX;
      const accommodationRevenueOne = workingDays * nightlyPrice;

      // 清掃売上: ゲストから受け取る清掃料金（売上として計上）
      // ※清掃回数 = 稼働日数 / 平均宿泊数
      const cleaningCount = workingDays / avgStay;
      const cleaningRevenueOne = cleaningCount * cleaningUnit;

      // 1部屋売上 = 宿泊売上 + 清掃売上
      const oneRoomRevenue = accommodationRevenueOne + cleaningRevenueOne;
      // 部屋タイプ合計売上 = 1部屋売上 × 部屋数
      const baseTypeRevenue = oneRoomRevenue * roomCount;

      /* 成長率を適用 */
      const g = growthFactor(idx);
      const typeRevenue = baseTypeRevenue * g;

      // 変動費は成長後の売上に対して計算
      const outsourcingFee = Math.round(typeRevenue * OUTSOURCING_FEE_RATE);
      const otaFee = Math.round(typeRevenue * OTA_FEE_RATE);
      // 清掃費: 清掃業者への支払い（経費として計上）
      // ※清掃売上と同額で計算（実際は業者との契約により異なる可能性あり）
      const cleaningCost = Math.round(roomCount * cleaningUnit * cleaningCount);
      const consumablesCost = Math.round(roomCount * workingDays * consumablesPerNight);

      const totalExpenses =
        outsourcingFee + otaFee + waterUnitPerMonth + cleaningCost + consumablesCost;

      // 最初の月だけ詳細ログ出力
      if (idx === 0) {
        console.log(`  📅 ${label} の計算詳細:`);
        console.log(`    稼働日数: ${workingDays}日`);
        console.log(`    月次指数: ${monthlyIndex}`);
        console.log(
          `    宿泊単価（実際）: ¥${nightlyPrice.toLocaleString()} = ¥${baseNightly.toLocaleString()} × ${monthlyIndex} × ${BUILDING_AGE_INDEX}`,
        );
        console.log(
          `    1部屋の宿泊売上: ¥${accommodationRevenueOne.toLocaleString()} = ${workingDays}日 × ¥${nightlyPrice.toLocaleString()}`,
        );
        console.log(
          `    1部屋の清掃売上: ¥${cleaningRevenueOne.toLocaleString()} = ${(workingDays / avgStay).toFixed(1)}回 × ¥${cleaningUnit.toLocaleString()}`,
        );
        console.log(
          `    1部屋の合計売上: ¥${oneRoomRevenue.toLocaleString()} = ¥${accommodationRevenueOne.toLocaleString()} + ¥${cleaningRevenueOne.toLocaleString()}`,
        );
        console.log(`    全${roomCount}室の売上（基準）: ¥${baseTypeRevenue.toLocaleString()}`);
        console.log(`    成長率: ${g}倍`);
        console.log(`    全${roomCount}室の売上（成長後）: ¥${typeRevenue.toLocaleString()}`);
        console.log(`    ---`);
        console.log(
          `    運営委託費(20%): ¥${outsourcingFee.toLocaleString()} = ¥${typeRevenue.toLocaleString()} × 0.20`,
        );
        console.log(
          `    OTA手数料(13%): ¥${otaFee.toLocaleString()} = ¥${typeRevenue.toLocaleString()} × 0.13`,
        );
        console.log(
          `    清掃費: ¥${cleaningCost.toLocaleString()} = ${roomCount}室 × ¥${cleaningUnit.toLocaleString()} × ${(workingDays / avgStay).toFixed(1)}回`,
        );
        console.log(
          `    消耗品費: ¥${consumablesCost.toLocaleString()} = ${roomCount}室 × ${workingDays}日 × ¥${consumablesPerNight.toLocaleString()}`,
        );
        console.log(`    水道光熱費: ¥${waterUnitPerMonth.toLocaleString()}`);
        console.log(`    月間支出合計: ¥${totalExpenses.toLocaleString()}`);
      }

      monthlyRevenues.push({
        month: label,
        workingDays,
        monthlyIndex,
        nightlyPrice,
        accommodationRevenue: accommodationRevenueOne * roomCount * g, // 全部屋分
        cleaningRevenue: cleaningRevenueOne * roomCount * g, // 全部屋分
        totalRevenue: (accommodationRevenueOne + cleaningRevenueOne) * roomCount * g, // 修正：重複を解消
      });
      monthlyExpenses.push({
        month: label,
        outsourcingFee,
        otaFee,
        waterUtilityCost: waterUnitPerMonth,
        cleaningCost,
        consumablesCost,
        totalExpenses,
      });

      sumRevenue += typeRevenue;
      sumExpenses += totalExpenses;
    });

    return {
      name: room.name,
      capacity,
      beds,
      count: roomCount,
      area: N(room.roomArea, 0),
      revenue: Math.round(sumRevenue),
      expenses: Math.round(sumExpenses),
      profit: Math.round(sumRevenue - sumExpenses),
      monthlyRevenues,
      monthlyExpenses,
      occupancyRate: 0,
      // 元の入力値を保存
      inputValues: {
        lodgingUnitPrice: baseNightly,
        cleaningUnitPrice: cleaningUnit,
        consumablesPerNight: consumablesPerNight,
        avgStayNights: avgStay,
        waterUtilityCostPerMonth: waterUnitPerMonth,
      },
    };
  });

  /* 集計 */
  const totalRevenue = perRoomResults.reduce((s, r) => s + r.revenue, 0);
  const roomTypeExpenses = perRoomResults.reduce((s, r) => s + r.expenses, 0);

  console.log("\n💰 === 集計結果 ===");
  console.log("売上合計（全部屋タイプ）:", `¥${totalRevenue.toLocaleString()}`);
  console.log("支出合計（変動費）:", `¥${roomTypeExpenses.toLocaleString()}`);

  const consumablesWindow = perRoomResults.reduce((sum, r) => {
    return sum + r.monthlyExpenses.reduce((ss: number, m: any) => ss + N(m.consumablesCost, 0), 0);
  }, 0);

  // 稼働率の計算
  // 実際の稼働日数（民泊新法適用時は制限後の値）
  const totalEffectiveWorkingDays = monthWindow.reduce((sum, { label }) => {
    return sum + (effectiveWorkingDaysMap.get(label) ?? 0);
  }, 0);

  // 期間中のカレンダー日数（理論上の最大稼働可能日数）
  const totalCalendarDays = monthWindow.reduce((sum, { year, month1 }) => {
    return sum + getDaysInMonth(year, month1);
  }, 0);

  // 民泊新法適用時の年間上限日数（期間に応じて按分）
  const annualLimitDays = facility.isLaw
    ? Math.round((MINPAKU_LAW_MAX_DAYS / 12) * monthsLen)
    : totalCalendarDays;

  // 稼働率 = 実際の稼働日数 / 理論上の最大日数 × 100
  // 民泊新法適用時は年間180日が上限なので、それを基準にする
  const maxPossibleDays = facility.isLaw ? annualLimitDays : totalCalendarDays;
  const rawOccupancyRate = maxPossibleDays > 0
    ? (totalEffectiveWorkingDays / maxPossibleDays) * 100
    : 0;
  const occupancyRate = Math.min(Math.round(rawOccupancyRate * 10) / 10, 100);

  const { trash, internet } = (() => {
    const tiers = [
      { max: 5, key: 1 },
      { max: 15, key: 6 },
      { max: 25, key: 16 },
      { max: 40, key: 26 },
      { max: 50, key: 41 },
      { max: 100, key: 51 },
    ];
    const tier = tiers.find((t) => totalRoomCount <= t.max);
    const key = tier ? tier.key : 100;
    return fixedExpenseTable.get(key) || { trash: 0, internet: 0 };
  })();

  const buildingMonthlyFixed = RENT_COST + SYSTEM_FEE + CHECKIN_TABLET_COST + trash + internet;
  const buildingFixedForWindow = buildingMonthlyFixed * monthsLen;
  const buildingYearlyFixed = buildingMonthlyFixed * 12;

  console.log("\n🏢 固定費（月額）:", {
    家賃: `¥${RENT_COST.toLocaleString()}`,
    システム料金: `¥${SYSTEM_FEE.toLocaleString()}`,
    タブレット: `¥${CHECKIN_TABLET_COST.toLocaleString()}`,
    ゴミ回収: `¥${trash.toLocaleString()}`,
    インターネット: `¥${internet.toLocaleString()}`,
    月額合計: `¥${buildingMonthlyFixed.toLocaleString()}`,
  });
  console.log(`固定費（${monthsLen}ヶ月分）: ¥${buildingFixedForWindow.toLocaleString()}`);

  const totalExpensesForWindow = roomTypeExpenses + buildingFixedForWindow;
  const totalProfitForWindow = totalRevenue - totalExpensesForWindow;

  console.log("\n✅ === 最終結果 ===");
  console.log("総売上:", `¥${totalRevenue.toLocaleString()}`);
  console.log("総支出:", `¥${totalExpensesForWindow.toLocaleString()}`);
  console.log("  - 変動費:", `¥${roomTypeExpenses.toLocaleString()}`);
  console.log("  - 固定費:", `¥${buildingFixedForWindow.toLocaleString()}`);
  console.log("営業利益:", `¥${totalProfitForWindow.toLocaleString()}`);
  console.log(
    `稼働率: ${occupancyRate}% (稼働日数: ${totalEffectiveWorkingDays}日 / 最大可能日数: ${maxPossibleDays}日${facility.isLaw ? " ※民泊新法180日/年制限適用" : ""})`,
  );
  console.log("🏁 === シミュレーション完了 ===\n");

  perRoomResults.forEach((r) => {
    r.occupancyRate = occupancyRate;
  });

  /* 結果を返す */
  return {
    totalResults: {
      totalRevenue,
      totalExpenses: totalExpensesForWindow,
      profit: totalProfitForWindow,
      occupancyRate,
    },
    perRoomResults,
    breakdownYearly: {
      trashYearly: trash * 12,
      rentYearly: RENT_COST * 12,
      internetYearly: internet * 12,
      consumablesYearly: Math.round(consumablesWindow * (12 / monthsLen)),
      systemYearly: SYSTEM_FEE * 12,
      tabletYearly: CHECKIN_TABLET_COST * 12,
      buildingYearlyFixed,
    },
    breakdownPeriod: {
      months: monthsLen,
      trash: trash * monthsLen,
      rent: RENT_COST * monthsLen,
      internet: internet * monthsLen,
      consumables: Math.round(consumablesWindow),
      system: SYSTEM_FEE * monthsLen,
      tablet: CHECKIN_TABLET_COST * monthsLen,
      buildingFixedTotal: buildingFixedForWindow,
    },
  };
}
