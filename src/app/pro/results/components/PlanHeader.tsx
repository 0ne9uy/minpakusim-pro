"use client";

/* ===========================
   プランヘッダ（最小構成 / RSuite）
   - プラン名の編集
   - 月レンジ選択（DateRangePicker）
   - 選択値は補正なしで親へ返す
   =========================== */

import "rsuite/dist/rsuite-no-reset.min.css";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { DateRangePicker } from "rsuite";
import { Button } from "@/components/ui/button";

/* 期間（互換用） */
type PeriodState = {
  year: number;
  startMonth: number;
  endMonth: number;
  endYear?: number;
  monthsLen: number;
  periodText?: string;
};

type YM = { y: number; m: number };

type Props = {
  name: string;
  onNameChange?: (next: string) => void;
  onEditRoomTypes?: () => void;
  className?: string;
  label?: string;

  period?: PeriodState;
  onPeriodChange?: (next: {
    year: number;
    startMonth: number;
    endMonth: number;
    endYear?: number;
  }) => void;

  /* 選択可能レンジ（提出月〜36ヶ月など） */
  min?: YM;
  max?: YM;
};

/* UTC 1日 */
function firstDayUTC(y: number, m1: number) {
  return new Date(Date.UTC(y, m1 - 1, 1));
}

/* Date → {y,m} (UTC) */
function toYM(d: Date): YM {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

/* 範囲外判定 */
function isOutOfRange(d: Date, min?: YM, max?: YM) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (min && (y < min.y || (y === min.y && m < min.m))) return true;
  if (max && (y > max.y || (y === max.y && m > max.m))) return true;
  return false;
}

function PlanHeaderImpl({
  name,
  onNameChange,
  onEditRoomTypes,
  className,
  label = "プラン名",
  period,
  onPeriodChange,
  min,
  max,
}: Props) {
  /* ------------------------------
   * プラン名編集
   * ------------------------------ */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [editing]);

  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    onNameChange?.(next);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  /* ------------------------------
   * period → ピッカー値
   * ------------------------------ */
  const pickerValueFromProp = useMemo<[Date, Date] | null>(() => {
    if (!period) return null;
    const endY =
      period.endYear ?? (period.endMonth >= period.startMonth ? period.year : period.year + 1);
    return [firstDayUTC(period.year, period.startMonth), firstDayUTC(endY, period.endMonth)];
  }, [period]);

  /* ------------------------------
   * ローカル状態（即時反映）
   * ------------------------------ */
  const [localRange, setLocalRange] = useState<[Date, Date] | null>(pickerValueFromProp);
  useEffect(() => setLocalRange(pickerValueFromProp), [pickerValueFromProp]);

  /* ------------------------------
   * 変更（ローカル更新→親へ通知）
   * ------------------------------ */
  const handleChange = (range: [Date, Date] | null) => {
    setLocalRange(range);
    if (!range || !onPeriodChange) return;
    const [s, e] = range;
    const sYM = toYM(s);
    const eYM = toYM(e);
    onPeriodChange({
      year: sYM.y,
      startMonth: sYM.m,
      endMonth: eYM.m,
      endYear: eYM.y,
    });
  };

  /* ------------------------------
   * 無効化（日付が範囲外）
   * ------------------------------ */
  const shouldDisableDate = (d: Date) => isOutOfRange(d, min, max);

  /* ------------------------------
   * 表示用：選択月数
   * ------------------------------ */
  const monthsLabel = useMemo(() => {
    if (!localRange) return "";
    const [s, e] = localRange;
    const sm = s.getUTCFullYear() * 12 + s.getUTCMonth();
    const em = e.getUTCFullYear() * 12 + e.getUTCMonth();
    const len = em - sm + 1;
    return `${len}ヶ月`;
  }, [localRange]);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white/90 px-4 py-3 ${className ?? ""}`}
    >
      {/* ------------------------------
       * 左：プラン名
       * ------------------------------ */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-gray-500">{label}</span>

        {!editing ? (
          <>
            <span className="truncate font-medium">{name || "（未設定）"}</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              編集
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              className="w-56 rounded-md border px-3 py-1 text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              onBlur={commit}
              placeholder="プラン名を入力"
            />
            <Button
              type="button"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commit}
            >
              保存
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancel}
            >
              キャンセル
            </Button>
          </div>
        )}
      </div>

      {/* ------------------------------
       * 右：月レンジピッカー + 部屋タイプ編集ボタン
       * ------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        {onEditRoomTypes && (
          <Button type="button" variant="outline" size="sm" onClick={onEditRoomTypes}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            部屋タイプを編集
          </Button>
        )}
        <DateRangePicker
          value={localRange as any}
          onChange={handleChange as any}
          format="yyyy年MM月"
          editable={false}
          placement="bottomEnd"
          shouldDisableDate={shouldDisableDate}
          character=" - "
          className="headerRange !max-w-[260px] overflow-hidden"
          ranges={[]}
          hoverRange="month"
          limitStartYear={2}
          limitEndYear={5}
          cleanable={false}
        />
        <span className="text-gray-500 text-xs">{monthsLabel}</span>
      </div>

      <style jsx global>
        {`
          /* 入力とアイコンの並びを反転（任意） */
          .headerRange .rs-input-group.rs-input-group-inside {
            flex-direction: row-reverse;
          }
          .headerRange .rs-input-group-addon {
            padding-right: 0 !important;
          }
          .headerRange svg {
            width: 16px !important;
            height: 16px !important;
          }
        `}
      </style>
    </div>
  );
}

export default memo(PlanHeaderImpl);
