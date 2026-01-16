"use client";

import { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";

type CSVEditorProps = {
  content: string;
  onChange: (content: string) => void;
  fileName: string;
};

type CellEdit = {
  row: number;
  col: number;
};

export default function CSVEditor({ content, onChange, fileName }: CSVEditorProps) {
  const [editingCell, setEditingCell] = useState<CellEdit | null>(null);
  const [editValue, setEditValue] = useState("");

  // CSVをパース
  const { headers, rows } = useMemo(() => {
    const result = Papa.parse<string[]>(content, {
      skipEmptyLines: true,
    });

    if (result.data.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = result.data[0] || [];
    const rows = result.data.slice(1);

    return { headers, rows };
  }, [content]);

  // セルの編集開始
  const startEdit = (rowIndex: number, colIndex: number, value: string) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(value);
  };

  // セルの編集完了
  const finishEdit = useCallback(() => {
    if (!editingCell) return;

    const { row, col } = editingCell;
    const newRows = [...rows];
    const newRow = [...(newRows[row] || [])];
    newRow[col] = editValue;
    newRows[row] = newRow;

    // CSVに変換
    const allData = [headers, ...newRows];
    const newContent = Papa.unparse(allData);
    onChange(newContent);

    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, headers, rows, onChange]);

  // キーボードイベント
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      finishEdit();
      // 次のセルに移動
      if (editingCell) {
        const nextCol = e.shiftKey ? editingCell.col - 1 : editingCell.col + 1;
        if (nextCol >= 0 && nextCol < headers.length) {
          const value = rows[editingCell.row]?.[nextCol] || "";
          startEdit(editingCell.row, nextCol, value);
        }
      }
    }
  };

  // ヘッダーセルのスタイル
  const getHeaderStyle = (index: number) => {
    // 最初の列（都道府県名など）は固定幅
    if (index === 0) {
      return "min-w-[100px] sticky left-0 z-10 bg-gray-100";
    }
    return "min-w-[80px]";
  };

  // データセルのスタイル
  const getCellStyle = (colIndex: number, isEditing: boolean) => {
    let style = "px-2 py-1 border-b border-r text-sm ";

    // 最初の列は固定
    if (colIndex === 0) {
      style += "sticky left-0 z-10 bg-white font-medium ";
    }

    // 編集中のセル
    if (isEditing) {
      style += "bg-yellow-100 ";
    } else {
      style += "hover:bg-blue-50 cursor-pointer ";
    }

    return style;
  };

  // 数値かどうかを判定
  const isNumeric = (value: string) => {
    if (!value || value.trim() === "") return false;
    return !isNaN(Number(value.replace(/,/g, "")));
  };

  if (headers.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-500">
        データがありません
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-gray-100">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className={`border-b border-r px-2 py-2 text-left font-medium text-gray-700 ${getHeaderStyle(index)}`}
              >
                {header || `列${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {headers.map((_, colIndex) => {
                const value = row[colIndex] || "";
                const isEditing =
                  editingCell?.row === rowIndex && editingCell?.col === colIndex;

                return (
                  <td
                    key={colIndex}
                    className={getCellStyle(colIndex, isEditing)}
                    onDoubleClick={() => startEdit(rowIndex, colIndex, value)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={finishEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full border-none bg-transparent px-0 py-0 focus:outline-none focus:ring-0"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`block ${
                          isNumeric(value) ? "text-right" : "text-left"
                        }`}
                      >
                        {value}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* フッター情報 */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {rows.length} 行 × {headers.length} 列
        </span>
        <span>ダブルクリックでセルを編集 | Tab で次のセルへ | Esc でキャンセル</span>
      </div>
    </div>
  );
}
