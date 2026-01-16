// Pro版専用のAPIエンドポイント
// Simple版とは独立して動作し、buildingAgeDataを含むすべてのデータを提供

import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { join } from "node:path";

export async function GET(request: Request) {
  const proDataDir = join(process.cwd(), "src/app/pro/lib/data");

  // URLパラメータから民泊新法適用フラグを取得
  const url = new URL(request.url);
  const isLaw = url.searchParams.get("isLaw") === "true";

  // Pro版のデータディレクトリから読み込み（Simple版のデータもここに移動済み）
  const baseCsvText = readFileSync(join(proDataDir, "base-price.csv"), "utf-8");

  // 民泊新法適用時はworking-days-normal.csvを使用、そうでなければworking-days.csvを使用
  const workingDaysFileName = isLaw ? "working-days-normal.csv" : "working-days.csv";
  const workingDaysCsvText = readFileSync(join(proDataDir, workingDaysFileName), "utf-8");

  const indexCsvText = readFileSync(join(proDataDir, "prefecture-month-index.csv"), "utf-8");
  const rankCsvText = readFileSync(join(proDataDir, "room-rank.csv"), "utf-8");
  const cleaningCsvText = readFileSync(join(proDataDir, "cleaning-price.csv"), "utf-8");
  const expensesCsvText = readFileSync(join(proDataDir, "expenses.csv"), "utf-8");

  // Pro版専用データ（築年数係数テーブル）
  const buildingAgeData = readFileSync(join(proDataDir, "building-age.csv"), "utf-8");

  return NextResponse.json({
    baseCsvText,
    workingDaysCsvText,
    indexCsvText,
    rankCsvText,
    cleaningCsvText,
    expensesCsvText,
    buildingAgeData, // Pro版で必須
  });
}
