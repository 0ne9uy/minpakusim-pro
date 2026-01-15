"use client";

import { useRouter } from "next/navigation";
import { downloadCSV, exportToCSV } from "@/app/pro/lib/csvUtils";
import type { FormValues } from "@/app/pro/lib/types";
import { Button } from "@/components/ui/button";

type Tab = "overview" | "sales" | "expenses" | "profit";
type RoomFilter = "total" | `room-${number}`;

type Props = {
  facility: FormValues;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  roomFilter: RoomFilter;
  onRoomFilterChange: (filter: RoomFilter) => void;
  perRoomResults: Array<{ name?: string; capacity: number; area: number }>;
};

export default function PlanControls({
  facility,
  activeTab,
  onTabChange,
  roomFilter,
  onRoomFilterChange,
  perRoomResults,
}: Props) {
  const router = useRouter();

  const handleExportCSV = () => {
    try {
      const csvContent = exportToCSV(facility);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `simulation_${facility.planName || "plan"}_${timestamp}.csv`;
      downloadCSV(csvContent, filename);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      alert(`CSVエクスポートエラー: ${message}`);
    }
  };

  const handleImportCSV = () => {
    router.push("/pro/import");
  };

  return (
    <div className="flex items-center justify-between bg-gray-50 px-6 py-4">
      {/* 左側: 部屋タイプフィルタ（overviewタブのみ表示） */}
      <div className="flex flex-wrap items-center gap-2">
        {activeTab === "overview" && (
          <>
            <Button
              onClick={() => onRoomFilterChange("total")}
              className={`h-9 rounded px-3 py-1 text-sm font-medium shadow transition-colors ${
                roomFilter === "total"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              全体
            </Button>

            {perRoomResults.map((r, i) => {
              const label = r.name || `タイプ${String.fromCharCode(65 + i)}`;
              const title = `${r.capacity}名 ${r.area}㎡`;
              const key = r.name || `room-${r.capacity}-${r.area}-${i}`;
              return (
                <Button
                  key={key}
                  onClick={() => onRoomFilterChange(`room-${i}` as RoomFilter)}
                  title={title}
                  className={`h-9 rounded px-3 py-1 text-sm font-medium shadow transition-colors ${
                    roomFilter === `room-${i}`
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {label}
                </Button>
              );
            })}
          </>
        )}
      </div>

      {/* 右側: CSVボタン */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportCSV}
          className="flex items-center gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          CSVインポート
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="flex items-center gap-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17,8 12,3 7,8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          CSVエクスポート
        </Button>
      </div>
    </div>
  );
}
