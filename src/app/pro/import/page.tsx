"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { importFromCSV } from "@/app/pro/lib/csvUtils";
import { Button } from "@/components/ui/button";

export default function ImportPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("CSVファイルを選択してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = importFromCSV(text);

      // データを検証
      if (!data.roomTypes || data.roomTypes.length === 0) {
        throw new Error("部屋タイプが見つかりません");
      }

      // localStorageに保存
      // ソースページを記録（CSVから読み取った値、なければ"new"をデフォルト）
      const sourcePage = (data as any).sourcePage || "new";
      const storageKey = sourcePage === "existing" ? "proData-existing" : "proData-new";
      localStorage.setItem(storageKey, JSON.stringify(data));
      localStorage.setItem("proSourcePage", sourcePage);

      // 結果ページへリダイレクト
      router.push("/pro/results");
    } catch (e: any) {
      setError(e.message || "CSVの読み込みに失敗しました");
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">
          シミュレーションデータをインポート
        </h1>

        <p className="mb-6 text-gray-600">
          以前エクスポートしたCSVファイルをアップロードして、同じシミュレーション結果を表示します。
        </p>

        {/* ドラッグ&ドロップエリア */}
        <section
          aria-label="ファイルドロップエリア"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-6 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <div className="space-y-4">
            <div className="text-5xl">📁</div>
            <div>
              <p className="mb-2 text-lg font-medium text-gray-700">
                CSVファイルをドラッグ&ドロップ
              </p>
              <p className="text-sm text-gray-500">または</p>
            </div>
            <div>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
              <Button
                type="button"
                onClick={() => document.getElementById("file-input")?.click()}
                disabled={loading}
              >
                {loading ? "読み込み中..." : "ファイルを選択"}
              </Button>
            </div>
          </div>
        </section>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
            <p className="font-medium">エラー</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 説明 */}
        <div className="space-y-3 rounded-lg bg-blue-50 p-4">
          <p className="font-medium text-blue-900">📝 注意事項</p>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• 結果ページでエクスポートしたCSVファイルのみ対応しています</li>
            <li>• ファイルの形式が正しくない場合、エラーが表示されます</li>
            <li>• インポート後、自動的に結果ページへ移動します</li>
          </ul>
        </div>

        {/* 戻るボタン */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => router.push("/pro/")}>
            新規作成に戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
