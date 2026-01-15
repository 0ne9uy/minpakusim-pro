"use client";

/* ■ 金額表示フォーマット（JPY） */
const fmtJPY = (n: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

/* 型: simulate の戻り値（親から渡される集計済みデータ） */
import type { simulate } from "../../lib/simulate";

type SimResult = Awaited<ReturnType<typeof simulate>>;

/* 依存コンポーネント */
import React from "react";
import SimulationChart from "./charts/SimulationPeriodChart";
import PeriodBuildingExpenses from "./PeriodBuildingExpenses";
import ThreeYearsSummary from "./ThreeYearsSummary";
import { getRoomDisplayName } from "@/lib/utils";

/* プロップス
   - result: 事前に計算済みの期間データ（親が36ヶ月フル→スライスして渡す）
   - roomFilter: 表示する部屋フィルタ（total or room-N）
*/
type RoomFilter = "total" | `room-${number}`;
type Props = { result: SimResult; roomFilter?: RoomFilter };

export default function SimulationResults({ result, roomFilter = "total" }: Props) {
  /* 集計済みデータの分解 */
  const { totalResults, perRoomResults, breakdownPeriod } = result;

  /* 検証セクションの開閉状態 */
  const [showValidation, setShowValidation] = React.useState(false);
  /* 各部屋タイプのアコーディオン開閉状態 */
  const [openRooms, setOpenRooms] = React.useState<Record<number, boolean>>({});
  /* 総支出セクションの部屋タイプ開閉状態 */
  const [openExpenseRooms, setOpenExpenseRooms] = React.useState<Record<number, boolean>>({});

  /* 画面構成 */
  return (
    <section className="space-y-6">
      {/* 月次の推移グラフ（親でスライス済みの範囲を表示） */}
      <SimulationChart result={result} mode={roomFilter} />

      {/* テーブル（総合および部屋タイプ別の合計） */}
      <div className="overflow-x-auto">
        <div className="w-full min-w-[560px] overflow-hidden rounded-xl border bg-white px-10 py-7">
          <table className="w-full border-collapse">
            <thead className="h-15">
              <tr>
                <th className="p-3 text-left">項目</th>
                <th className="p-3 text-right">売上</th>
                <th className="p-3 text-right">支出</th>
                <th className="p-3 text-right">変動費利益</th>
              </tr>
            </thead>
            <tbody className="[&_tr]:border-t">
              <tr className="bg-white/60">
                <td className="p-3 font-medium">総合</td>
                <td className="p-3 text-right">{fmtJPY(totalResults.totalRevenue)}</td>
                <td className="p-3 text-right">{fmtJPY(totalResults.totalExpenses)}</td>
                <td className="p-3 text-right">
                  <span className={totalResults.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {fmtJPY(totalResults.profit)}
                  </span>
                  <div className="text-xs text-gray-500">（固定費込み）</div>
                </td>
              </tr>
              {perRoomResults.map((r, i) => (
                <tr key={r.name || `${r.capacity}-${r.area}-${i}`}>
                  <td className="p-3">{getRoomDisplayName({
                    name: r.name,
                    roomArea: r.area,
                    computedRooms: r.count,
                    capacity: r.capacity
                  })}</td>
                  <td className="p-3 text-right">{fmtJPY(r.revenue)}</td>
                  <td className="p-3 text-right">{fmtJPY(r.expenses)}</td>
                  <td className="p-3 text-right">
                    <span className={r.profit >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {fmtJPY(r.profit)}
                    </span>
                    <div className="text-xs text-gray-500">（変動費のみ）</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 右側：期間内訳グラフ、左側：3年サマリ（必要に応じて期間の見出しを調整） */}
      <div className="grid grid-cols-6 items-start gap-8">
        <div className="col-span-3">
          <ThreeYearsSummary data={result} />
        </div>
        <div className="col-span-3">
          <PeriodBuildingExpenses
            data={{
              trash: breakdownPeriod.trash,
              rent: breakdownPeriod.rent,
              internet: breakdownPeriod.internet,
              consumables: breakdownPeriod.consumables,
              system: breakdownPeriod.system,
              tablet: breakdownPeriod.tablet,
            }}
          />
        </div>
      </div>

      {/* 検証用セクション */}
      <div className="w-full rounded-xl border bg-white px-10 py-7">
        <button
          type="button"
          onClick={() => setShowValidation(!showValidation)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold">🔍 計算詳細（検証用）</h3>
          <span className="text-2xl">{showValidation ? "▲" : "▼"}</span>
        </button>

        {showValidation && (
          <div className="mt-6 space-y-6">
            {/* 注意書き */}
            <div className="rounded-lg bg-blue-50 p-4 text-sm">
              <p className="font-semibold text-blue-900 mb-2">💡 検証のヒント</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>ブラウザの開発者コンソール（F12）で詳細なログを確認できます</li>
                <li>最初の月のデータで手計算と比較してください</li>
                <li>成長率は12ヶ月目から1.1倍、24ヶ月目から1.15倍になります</li>
                <li>売上には宿泊売上と清掃売上の両方が含まれます</li>
                <li>運営委託費とOTA手数料は成長後の売上に対して計算されます</li>
              </ul>
            </div>

            {/* 計算ロジックの可視化 */}
            <div className="space-y-4 border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
              <h4 className="font-semibold text-lg text-purple-900 flex items-center gap-2">
                <span>🧮</span>
                <span>計算ロジックの流れ（1ヶ月目を例に）</span>
              </h4>
              {perRoomResults.map((room, idx) => {
                const firstMonth = room.monthlyRevenues?.[0];
                const firstExpense = room.monthlyExpenses?.[0];
                if (!firstMonth || !firstExpense) return null;

                const isOpen = openRooms[idx] ?? false;
                const toggleRoom = () => {
                  setOpenRooms((prev) => ({ ...prev, [idx]: !prev[idx] }));
                };

                return (
                  <div
                    key={room.name || idx}
                    className="bg-white rounded-lg border-2 border-gray-300"
                  >
                    <button
                      type="button"
                      onClick={toggleRoom}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <h5 className="font-semibold text-base">
                        {room.name || `部屋タイプ${String.fromCharCode(65 + idx)}`}
                      </h5>
                      <span
                        className="text-2xl text-gray-600 transition-transform"
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        ▼
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 space-y-4 border-t">
                        {/* 入力された部屋情報 */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="font-semibold text-sm mb-3 text-gray-700">
                            📋 入力情報
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">部屋数:</span>
                              <span className="font-semibold">{room.count}室</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">定員:</span>
                              <span className="font-semibold">{room.capacity}名</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">ベッド数:</span>
                              <span className="font-semibold">{room.beds}台</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">面積:</span>
                              <span className="font-semibold">{room.area}㎡</span>
                            </div>
                            {(() => {
                              // 元の入力値を使用（存在しない場合は逆算）
                              const inputValues = (room as any).inputValues;
                              const avgStay = inputValues?.avgStayNights ?? 2.5;
                              const cleaningTimes = firstMonth.workingDays / avgStay;
                              const basePrice =
                                inputValues?.lodgingUnitPrice ??
                                firstMonth.nightlyPrice / firstMonth.monthlyIndex;
                              const cleaningUnitPrice =
                                inputValues?.cleaningUnitPrice ??
                                firstExpense.cleaningCost / (cleaningTimes * room.count);
                              const consumablesPerNight =
                                inputValues?.consumablesPerNight ??
                                firstExpense.consumablesCost /
                                  (firstMonth.workingDays * room.count);
                              const waterUtilityCost =
                                inputValues?.waterUtilityCostPerMonth ??
                                firstExpense.waterUtilityCost;

                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">基準宿泊単価:</span>
                                    <span className="font-semibold">{fmtJPY(basePrice)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">清掃単価:</span>
                                    <span className="font-semibold">
                                      {fmtJPY(cleaningUnitPrice)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">消耗品単価/泊:</span>
                                    <span className="font-semibold">
                                      {fmtJPY(consumablesPerNight)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">平均宿泊数:</span>
                                    <span className="font-semibold">{avgStay}泊</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">水道光熱費/月:</span>
                                    <span className="font-semibold">
                                      {fmtJPY(waterUtilityCost)}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* 収益の計算 */}
                        <div className="space-y-3">
                          <div className="font-semibold text-sm text-blue-700">📊 収益の計算</div>

                          <div className="ml-4 space-y-2 text-sm">
                            <div className="bg-blue-50 p-3 rounded">
                              <div className="font-semibold mb-1">① 実際の宿泊単価</div>
                              <div className="font-mono text-xs space-y-1">
                                {(() => {
                                  const inputValues = (room as any).inputValues;
                                  const basePrice =
                                    inputValues?.lodgingUnitPrice ??
                                    firstMonth.nightlyPrice / firstMonth.monthlyIndex;
                                  const buildingAgeIndex = 1.0; // 現在は1.0固定、将来的には動的に取得
                                  return (
                                    <>
                                      <div>= 基準単価 × 月次指数 × 築年数係数</div>
                                      <div className="text-blue-600">
                                        = {fmtJPY(basePrice)} × {firstMonth.monthlyIndex.toFixed(2)}{" "}
                                        × {buildingAgeIndex.toFixed(2)}
                                      </div>
                                      <div className="font-bold text-blue-700">
                                        = {fmtJPY(firstMonth.nightlyPrice)}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded">
                              <div className="font-semibold mb-1">② 1部屋の月間宿泊売上</div>
                              <div className="font-mono text-xs space-y-1">
                                <div>= 稼働日数 × 宿泊単価</div>
                                <div className="text-blue-600">
                                  = {firstMonth.workingDays}日 × {fmtJPY(firstMonth.nightlyPrice)}
                                </div>
                                <div className="font-bold text-blue-700">
                                  = {fmtJPY(firstMonth.accommodationRevenue / room.count)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded">
                              <div className="font-semibold mb-1">③ 全部屋の月間宿泊売上</div>
                              <div className="font-mono text-xs space-y-1">
                                <div>= 1部屋の売上 × 部屋数 × 成長率</div>
                                <div className="text-blue-600">
                                  = {fmtJPY(firstMonth.accommodationRevenue / room.count)} ×{" "}
                                  {room.count}室 × 1.0倍
                                </div>
                                <div className="font-bold text-blue-700">
                                  = {fmtJPY(firstMonth.accommodationRevenue)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded">
                              <div className="font-semibold mb-1">④ 清掃売上</div>
                              <div className="font-mono text-xs space-y-1">
                                {(() => {
                                  const inputValues = (room as any).inputValues;
                                  const avgStay = inputValues?.avgStayNights ?? 2.5;
                                  const cleaningTimes = firstMonth.workingDays / avgStay;
                                  const cleaningUnitPrice =
                                    inputValues?.cleaningUnitPrice ??
                                    firstMonth.cleaningRevenue / (cleaningTimes * room.count);
                                  return (
                                    <>
                                      <div>清掃回数 = 稼働日数 ÷ 平均宿泊数</div>
                                      <div className="text-blue-600">
                                        = {firstMonth.workingDays}日 ÷ {avgStay}泊 ={" "}
                                        {cleaningTimes.toFixed(1)}回
                                      </div>
                                      <div>清掃売上 = 清掃回数 × 清掃単価 × 部屋数</div>
                                      <div className="text-blue-600">
                                        = {cleaningTimes.toFixed(1)}回 × {fmtJPY(cleaningUnitPrice)}{" "}
                                        × {room.count}室
                                      </div>
                                      <div className="font-bold text-blue-700">
                                        = {fmtJPY(firstMonth.cleaningRevenue)}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="bg-green-100 p-3 rounded border-2 border-green-300">
                              <div className="font-semibold mb-1">⑤ 月間売上合計</div>
                              <div className="font-mono text-xs space-y-1">
                                <div>= 宿泊売上 + 清掃売上</div>
                                <div className="text-green-700">
                                  = {fmtJPY(firstMonth.accommodationRevenue)} +{" "}
                                  {fmtJPY(firstMonth.cleaningRevenue)}
                                </div>
                                <div className="font-bold text-green-800 text-base">
                                  = {fmtJPY(firstMonth.totalRevenue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 支出の計算 */}
                        <div className="space-y-3 border-t pt-4">
                          <div className="font-semibold text-sm text-red-700">📉 支出の計算</div>

                          <div className="ml-4 space-y-2 text-sm">
                            <div className="bg-red-50 p-3 rounded">
                              <div className="font-semibold mb-1">① 運営委託費（20%）</div>
                              <div className="font-mono text-xs space-y-1">
                                <div>= 月間売上（成長後） × 0.20</div>
                                <div className="text-red-600">
                                  = {fmtJPY(firstMonth.totalRevenue)} × 0.20
                                </div>
                                <div className="font-bold text-red-700">
                                  = {fmtJPY(firstExpense.outsourcingFee)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-50 p-3 rounded">
                              <div className="font-semibold mb-1">② OTA手数料（13%）</div>
                              <div className="font-mono text-xs space-y-1">
                                <div>= 月間売上（成長後） × 0.13</div>
                                <div className="text-red-600">
                                  = {fmtJPY(firstMonth.totalRevenue)} × 0.13
                                </div>
                                <div className="font-bold text-red-700">
                                  = {fmtJPY(firstExpense.otaFee)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-50 p-3 rounded">
                              <div className="font-semibold mb-1">③ 清掃費</div>
                              <div className="font-mono text-xs space-y-1">
                                {(() => {
                                  const inputValues = (room as any).inputValues;
                                  const avgStay = inputValues?.avgStayNights ?? 2.5;
                                  const cleaningTimes = firstMonth.workingDays / avgStay;
                                  const cleaningUnitPrice =
                                    inputValues?.cleaningUnitPrice ??
                                    firstExpense.cleaningCost / (cleaningTimes * room.count);
                                  return (
                                    <>
                                      <div>= 清掃回数 × 清掃単価 × 部屋数</div>
                                      <div className="text-red-600">
                                        = {cleaningTimes.toFixed(1)}回 × {fmtJPY(cleaningUnitPrice)}{" "}
                                        × {room.count}室
                                      </div>
                                      <div className="font-bold text-red-700">
                                        = {fmtJPY(firstExpense.cleaningCost)}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="bg-red-50 p-3 rounded">
                              <div className="font-semibold mb-1">④ 消耗品費</div>
                              <div className="font-mono text-xs space-y-1">
                                {(() => {
                                  const inputValues = (room as any).inputValues;
                                  const consumablesPerNight =
                                    inputValues?.consumablesPerNight ??
                                    firstExpense.consumablesCost /
                                      (firstMonth.workingDays * room.count);
                                  return (
                                    <>
                                      <div>= 稼働日数 × 消耗品単価/泊 × 部屋数</div>
                                      <div className="text-red-600">
                                        = {firstMonth.workingDays}日 × {fmtJPY(consumablesPerNight)}{" "}
                                        × {room.count}室
                                      </div>
                                      <div className="font-bold text-red-700">
                                        = {fmtJPY(firstExpense.consumablesCost)}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="bg-red-50 p-3 rounded">
                              <div className="font-semibold mb-1">⑤ 水道光熱費</div>
                              <div className="font-mono text-xs space-y-1">
                                <div className="text-gray-600">
                                  ※ 部屋面積から自動算出（月額固定）
                                </div>
                                <div className="font-bold text-red-700">
                                  = {fmtJPY(firstExpense.waterUtilityCost)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-100 p-3 rounded border-2 border-red-300">
                              <div className="font-semibold mb-1">⑥ 月間支出合計</div>
                              <div className="font-mono text-xs space-y-1">
                                <div>= 運営委託費 + OTA手数料 + 清掃費 + 消耗品費 + 水道光熱費</div>
                                <div className="text-red-700 text-xs">
                                  = {fmtJPY(firstExpense.outsourcingFee)} +{" "}
                                  {fmtJPY(firstExpense.otaFee)} +{fmtJPY(firstExpense.cleaningCost)}{" "}
                                  + {fmtJPY(firstExpense.consumablesCost)} +
                                  {fmtJPY(firstExpense.waterUtilityCost)}
                                </div>
                                <div className="font-bold text-red-800 text-base">
                                  = {fmtJPY(firstExpense.totalExpenses)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 利益の計算 */}
                        <div className="space-y-3 border-t pt-4">
                          <div className="bg-purple-100 p-4 rounded border-2 border-purple-300">
                            <div className="font-semibold mb-2 text-purple-900">
                              💰 月間利益（変動費のみ）
                            </div>
                            <div className="font-mono text-sm space-y-1">
                              <div>= 月間売上 - 月間支出</div>
                              <div className="text-purple-700">
                                = {fmtJPY(firstMonth.totalRevenue)} -{" "}
                                {fmtJPY(firstExpense.totalExpenses)}
                              </div>
                              <div className="font-bold text-purple-900 text-lg">
                                = {fmtJPY(firstMonth.totalRevenue - firstExpense.totalExpenses)}
                              </div>
                              <div className="text-xs text-gray-600 mt-2">
                                ※ この後、固定費（家賃・システム料金など）が引かれます
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 全体の集計ロジック */}
              <div className="bg-white rounded-lg p-5 space-y-4 border-2 border-purple-300">
                <h5 className="font-semibold text-base border-b pb-2 text-purple-900">
                  🏢 全体の集計（期間：{breakdownPeriod.months}ヶ月）
                </h5>

                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-semibold mb-1">① 総売上</div>
                    <div className="font-mono text-xs space-y-1">
                      <div>= 各部屋タイプの売上 × 期間月数</div>
                      <div className="text-gray-600">
                        {perRoomResults.map((r, i) => (
                          <div key={`room-revenue-${r.name || i}`}>
                            部屋タイプ{i + 1}: {fmtJPY(r.revenue)}
                          </div>
                        ))}
                      </div>
                      <div className="font-bold text-gray-800">
                        = {fmtJPY(totalResults.totalRevenue)}
                      </div>
                    </div>
                  </div>

                  {/* 総支出の詳細内訳 */}
                  <div className="bg-red-50 p-4 rounded border-2 border-red-200">
                    <div className="font-semibold mb-3 text-red-900">② 総支出の詳細内訳</div>

                    {/* 変動費の詳細 */}
                    <div className="space-y-2 mb-3">
                      <div className="font-semibold text-sm text-red-800">
                        📊 変動費（部屋タイプ別）
                      </div>
                      {perRoomResults.map((room, i) => {
                        const firstExpense = room.monthlyExpenses?.[0];
                        if (!firstExpense) return null;

                        // 期間全体の費用を計算（1ヶ月分 × 月数）
                        const totalOutsourcing = room.monthlyExpenses.reduce(
                          (sum: number, m: any) => sum + (m.outsourcingFee || 0),
                          0,
                        );
                        const totalOta = room.monthlyExpenses.reduce(
                          (sum: number, m: any) => sum + (m.otaFee || 0),
                          0,
                        );
                        const totalWater = room.monthlyExpenses.reduce(
                          (sum: number, m: any) => sum + (m.waterUtilityCost || 0),
                          0,
                        );
                        const totalCleaning = room.monthlyExpenses.reduce(
                          (sum: number, m: any) => sum + (m.cleaningCost || 0),
                          0,
                        );
                        const totalConsumables = room.monthlyExpenses.reduce(
                          (sum: number, m: any) => sum + (m.consumablesCost || 0),
                          0,
                        );

                        const isExpenseOpen = openExpenseRooms[i] ?? false;
                        const toggleExpenseRoom = () => {
                          setOpenExpenseRooms((prev) => ({ ...prev, [i]: !prev[i] }));
                        };

                        return (
                          <div
                            key={`expense-${room.name}-${i}`}
                            className="bg-white rounded border border-red-200"
                          >
                            <button
                              type="button"
                              onClick={toggleExpenseRoom}
                              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-red-900">
                                  {room.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  小計: {fmtJPY(room.expenses)}
                                </span>
                              </div>
                              <span
                                className="text-lg text-gray-600"
                                style={{
                                  transform: isExpenseOpen ? "rotate(180deg)" : "rotate(0deg)",
                                  display: "inline-block",
                                  transition: "transform 0.2s",
                                }}
                              >
                                ▼
                              </span>
                            </button>

                            {isExpenseOpen && (
                              <div className="p-3 pt-0 border-t">
                                <div className="space-y-1 text-xs font-mono">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">運営委託費(20%):</span>
                                    <span>{fmtJPY(totalOutsourcing)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">OTA手数料(13%):</span>
                                    <span>{fmtJPY(totalOta)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">水道光熱費:</span>
                                    <span>{fmtJPY(totalWater)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">清掃費:</span>
                                    <span>{fmtJPY(totalCleaning)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">消耗品費:</span>
                                    <span>{fmtJPY(totalConsumables)}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
                                    <span>小計:</span>
                                    <span>{fmtJPY(room.expenses)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="bg-yellow-50 p-2 rounded font-mono text-xs font-semibold flex justify-between">
                        <span>変動費合計:</span>
                        <span>
                          {fmtJPY(perRoomResults.reduce((sum, r) => sum + r.expenses, 0))}
                        </span>
                      </div>
                    </div>

                    {/* 固定費の詳細 */}
                    <div className="space-y-2">
                      <div className="font-semibold text-sm text-red-800">
                        🏢 固定費（建物全体）
                      </div>
                      <div className="bg-white p-3 rounded border border-red-200">
                        <div className="space-y-1 text-xs font-mono">
                          {(() => {
                            // 月額費用を計算
                            const rentPerMonth = breakdownPeriod.rent / breakdownPeriod.months;
                            const systemPerMonth = breakdownPeriod.system / breakdownPeriod.months;
                            const tabletPerMonth = breakdownPeriod.tablet / breakdownPeriod.months;
                            const trashPerMonth = breakdownPeriod.trash / breakdownPeriod.months;
                            const internetPerMonth =
                              breakdownPeriod.internet / breakdownPeriod.months;
                            const fixedPerMonth =
                              rentPerMonth +
                              systemPerMonth +
                              tabletPerMonth +
                              trashPerMonth +
                              internetPerMonth;

                            return (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">家賃:</span>
                                  <span>
                                    {fmtJPY(rentPerMonth)}/月 × {breakdownPeriod.months}ヶ月 ={" "}
                                    {fmtJPY(breakdownPeriod.rent)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">システム料金:</span>
                                  <span>
                                    {fmtJPY(systemPerMonth)}/月 × {breakdownPeriod.months}ヶ月 ={" "}
                                    {fmtJPY(breakdownPeriod.system)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">タブレット:</span>
                                  <span>
                                    {fmtJPY(tabletPerMonth)}/月 × {breakdownPeriod.months}ヶ月 ={" "}
                                    {fmtJPY(breakdownPeriod.tablet)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">ゴミ回収:</span>
                                  <span>
                                    {fmtJPY(trashPerMonth)}/月 × {breakdownPeriod.months}ヶ月 ={" "}
                                    {fmtJPY(breakdownPeriod.trash)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">インターネット:</span>
                                  <span>
                                    {fmtJPY(internetPerMonth)}/月 × {breakdownPeriod.months}ヶ月 ={" "}
                                    {fmtJPY(breakdownPeriod.internet)}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t pt-1 mt-1">
                                  <span className="text-gray-600">月額固定費:</span>
                                  <span className="font-semibold">{fmtJPY(fixedPerMonth)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded font-mono text-xs font-semibold flex justify-between">
                        <span>固定費合計:</span>
                        <span>{fmtJPY(breakdownPeriod.buildingFixedTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-100 p-4 rounded border-2 border-yellow-300">
                    <div className="font-semibold mb-2">③ 総支出合計</div>
                    <div className="font-mono text-xs space-y-1">
                      <div>= 変動費 + 固定費</div>
                      <div className="text-yellow-800">
                        = {fmtJPY(perRoomResults.reduce((sum, r) => sum + r.expenses, 0))} +{" "}
                        {fmtJPY(breakdownPeriod.buildingFixedTotal)}
                      </div>
                      <div className="font-bold text-yellow-900 text-base">
                        = {fmtJPY(totalResults.totalExpenses)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-100 p-4 rounded border-2 border-green-400">
                    <div className="font-semibold mb-2 text-green-900">④ 営業利益</div>
                    <div className="font-mono text-sm space-y-1">
                      <div>= 総売上 - 総支出</div>
                      <div className="text-green-700">
                        = {fmtJPY(totalResults.totalRevenue)} - {fmtJPY(totalResults.totalExpenses)}
                      </div>
                      <div
                        className={`font-bold text-xl ${totalResults.profit >= 0 ? "text-green-900" : "text-red-900"}`}
                      >
                        = {fmtJPY(totalResults.profit)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 部屋タイプごとの月別詳細 */}
            {perRoomResults.map((room, idx) => (
              <div key={room.name || idx} className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">
                  {room.name || `部屋タイプ${String.fromCharCode(65 + idx)}`} - 月別詳細
                </h4>

                {/* 売上の詳細 */}
                <div>
                  <h5 className="font-semibold text-sm mb-2">📈 月別売上</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border p-2 text-left">月</th>
                          <th className="border p-2 text-right">稼働日数</th>
                          <th className="border p-2 text-right">月次指数</th>
                          <th className="border p-2 text-right">宿泊単価</th>
                          <th className="border p-2 text-right">宿泊売上</th>
                          <th className="border p-2 text-right">清掃売上</th>
                          <th className="border p-2 text-right">合計売上</th>
                        </tr>
                      </thead>
                      <tbody>
                        {room.monthlyRevenues?.slice(0, 12).map((month: any, i: number) => (
                          <tr key={`month-${month.month}-${i}`} className="hover:bg-gray-50">
                            <td className="border p-2">{month.month}</td>
                            <td className="border p-2 text-right">{month.workingDays}日</td>
                            <td className="border p-2 text-right">
                              {month.monthlyIndex?.toFixed(2) || "-"}
                            </td>
                            <td className="border p-2 text-right">{fmtJPY(month.nightlyPrice)}</td>
                            <td className="border p-2 text-right">
                              {fmtJPY(month.accommodationRevenue)}
                            </td>
                            <td className="border p-2 text-right">
                              {fmtJPY(month.cleaningRevenue)}
                            </td>
                            <td className="border p-2 text-right font-semibold">
                              {fmtJPY(month.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 支出の詳細 */}
                <div>
                  <h5 className="font-semibold text-sm mb-2">📉 月別支出</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border p-2 text-left">月</th>
                          <th className="border p-2 text-right">運営委託費</th>
                          <th className="border p-2 text-right">OTA手数料</th>
                          <th className="border p-2 text-right">水道光熱費</th>
                          <th className="border p-2 text-right">清掃費</th>
                          <th className="border p-2 text-right">消耗品費</th>
                          <th className="border p-2 text-right">合計支出</th>
                        </tr>
                      </thead>
                      <tbody>
                        {room.monthlyExpenses?.slice(0, 12).map((month: any, i: number) => (
                          <tr key={`expense-${month.month}-${i}`} className="hover:bg-gray-50">
                            <td className="border p-2">{month.month}</td>
                            <td className="border p-2 text-right">
                              {fmtJPY(month.outsourcingFee)}
                            </td>
                            <td className="border p-2 text-right">{fmtJPY(month.otaFee)}</td>
                            <td className="border p-2 text-right">
                              {fmtJPY(month.waterUtilityCost)}
                            </td>
                            <td className="border p-2 text-right">{fmtJPY(month.cleaningCost)}</td>
                            <td className="border p-2 text-right">
                              {fmtJPY(month.consumablesCost)}
                            </td>
                            <td className="border p-2 text-right font-semibold">
                              {fmtJPY(month.totalExpenses)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {/* 固定費の詳細 */}
            <div className="space-y-2">
              <h4 className="font-semibold text-lg border-b pb-2">🏢 固定費内訳</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>家賃:</span>
                    <span className="font-mono">{fmtJPY(breakdownPeriod.rent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>システム料金:</span>
                    <span className="font-mono">{fmtJPY(breakdownPeriod.system)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>タブレット:</span>
                    <span className="font-mono">{fmtJPY(breakdownPeriod.tablet)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>ゴミ回収:</span>
                    <span className="font-mono">{fmtJPY(breakdownPeriod.trash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>インターネット:</span>
                    <span className="font-mono">{fmtJPY(breakdownPeriod.internet)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>固定費合計:</span>
                    <span className="font-mono">{fmtJPY(breakdownPeriod.buildingFixedTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 検証チェックリスト */}
            <div className="space-y-2">
              <h4 className="font-semibold text-lg border-b pb-2">✅ 整合性チェック</h4>
              <div className="space-y-2 text-sm">
                {(() => {
                  // 部屋別売上の合計 = 総売上
                  const roomTotalRevenue = perRoomResults.reduce((sum, r) => sum + r.revenue, 0);
                  const revenueMatch = Math.abs(roomTotalRevenue - totalResults.totalRevenue) < 1;

                  // 部屋別支出の合計 + 固定費 = 総支出
                  const roomTotalExpenses = perRoomResults.reduce((sum, r) => sum + r.expenses, 0);
                  const calculatedTotal = roomTotalExpenses + breakdownPeriod.buildingFixedTotal;
                  const expensesMatch = Math.abs(calculatedTotal - totalResults.totalExpenses) < 1;

                  return (
                    <>
                      <div className={`p-2 rounded ${revenueMatch ? "bg-green-50" : "bg-red-50"}`}>
                        <span className="mr-2">{revenueMatch ? "✅" : "❌"}</span>
                        <span>
                          部屋別売上の合計 ({fmtJPY(roomTotalRevenue)}) = 総売上 (
                          {fmtJPY(totalResults.totalRevenue)})
                        </span>
                      </div>
                      <div className={`p-2 rounded ${expensesMatch ? "bg-green-50" : "bg-red-50"}`}>
                        <span className="mr-2">{expensesMatch ? "✅" : "❌"}</span>
                        <span>
                          部屋別支出 ({fmtJPY(roomTotalExpenses)}) + 固定費 (
                          {fmtJPY(breakdownPeriod.buildingFixedTotal)}) = 総支出 (
                          {fmtJPY(totalResults.totalExpenses)})
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
