"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CSVEditor from "./_components/CSVEditor";

type CSVFile = {
  name: string;
  displayName: string;
  description: string;
  priority: string;
  lastModified: string | null;
  rowCount: number;
};

type FileData = {
  fileName: string;
  displayName: string;
  description: string;
  content: string;
  lastModified: string;
};

export default function DataManagementPage() {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ファイル一覧を取得
  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/csv-management?action=list");
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err) {
      setError("ファイル一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 個別ファイルを取得
  const fetchFile = useCallback(async (fileName: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/csv-management?file=${encodeURIComponent(fileName)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setFileData(data);
      setEditedContent(data.content);
      setHasChanges(false);
    } catch (err) {
      setError("ファイルの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存処理
  const handleSave = async () => {
    if (!selectedFile || !editedContent) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch("/api/csv-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile,
          content: editedContent,
          createBackup: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "保存に失敗しました");
        return;
      }

      setSuccessMessage("保存しました");
      setHasChanges(false);

      // ファイル一覧を更新
      fetchFiles();

      // 3秒後にメッセージを消す
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (fileData) {
      setEditedContent(fileData.content);
      setHasChanges(false);
    }
  };

  // ダウンロード処理
  const handleDownload = () => {
    if (!selectedFile || !editedContent) return;

    const blob = new Blob([editedContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // コンテンツ変更時
  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
    setHasChanges(newContent !== fileData?.content);
  };

  // ファイル選択時
  const handleFileSelect = (fileName: string) => {
    if (hasChanges) {
      const confirm = window.confirm("変更が保存されていません。破棄しますか？");
      if (!confirm) return;
    }
    setSelectedFile(fileName);
    if (fileName) {
      fetchFile(fileName);
    } else {
      setFileData(null);
      setEditedContent("");
      setHasChanges(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 優先度に応じた色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">データ管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            CSVマスターデータの確認・編集ができます
          </p>
        </div>

        {/* ツールバー */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {/* ファイル選択 */}
          <div className="flex-1">
            <select
              value={selectedFile}
              onChange={(e) => handleFileSelect(e.target.value)}
              className="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#C33529] focus:outline-none focus:ring-1 focus:ring-[#C33529]"
              disabled={isLoading}
            >
              <option value="">ファイルを選択...</option>
              {files.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.displayName} ({file.name})
                </option>
              ))}
            </select>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedFile && fetchFile(selectedFile)}
              disabled={!selectedFile || isLoading}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              再読込
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!selectedFile || !editedContent}
            >
              <Download className="mr-1 h-4 w-4" />
              ダウンロード
            </Button>
          </div>
        </div>

        {/* ファイル情報 */}
        {fileData && (
          <div className="mb-4 rounded-lg bg-blue-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-medium text-blue-900">{fileData.displayName}</h2>
                <p className="mt-1 text-sm text-blue-700">{fileData.description}</p>
              </div>
              <div className="text-right text-xs text-blue-600">
                最終更新: {new Date(fileData.lastModified).toLocaleString("ja-JP")}
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 p-4 text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">
            {successMessage}
          </div>
        )}

        {/* 変更警告 */}
        {hasChanges && (
          <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-yellow-700">
            変更があります。保存するか、キャンセルしてください。
          </div>
        )}

        {/* CSVエディタ */}
        {selectedFile && fileData ? (
          <div className="rounded-lg bg-white p-4 shadow">
            <CSVEditor
              content={editedContent}
              onChange={handleContentChange}
              fileName={selectedFile}
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg bg-white text-gray-500 shadow">
            ファイルを選択してください
          </div>
        )}

        {/* フッターアクション */}
        {selectedFile && fileData && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!hasChanges || isSaving}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-[#C33529] text-white hover:bg-[#a82d23]"
            >
              <Save className="mr-1 h-4 w-4" />
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        )}

        {/* ファイル一覧テーブル */}
        {!selectedFile && (
          <div className="mt-6 rounded-lg bg-white p-4 shadow">
            <h2 className="mb-4 font-medium text-gray-900">CSVファイル一覧</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="pb-2">ファイル名</th>
                  <th className="pb-2">説明</th>
                  <th className="pb-2">優先度</th>
                  <th className="pb-2">行数</th>
                  <th className="pb-2">最終更新</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.name}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => handleFileSelect(file.name)}
                  >
                    <td className="py-2 font-medium text-blue-600 hover:underline">
                      {file.displayName}
                    </td>
                    <td className="py-2 text-gray-600">{file.description}</td>
                    <td className={`py-2 ${getPriorityColor(file.priority)}`}>
                      {file.priority === "high" ? "高" : file.priority === "medium" ? "中" : "低"}
                    </td>
                    <td className="py-2">{file.rowCount}</td>
                    <td className="py-2 text-gray-500">
                      {file.lastModified
                        ? new Date(file.lastModified).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
