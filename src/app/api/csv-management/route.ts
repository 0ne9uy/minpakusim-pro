import { readFileSync, writeFileSync, existsSync, statSync, copyFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { join } from "node:path";

// CSVファイルの定義
const CSV_FILES = [
  {
    name: "monthly-index.csv",
    displayName: "月次変動係数",
    description: "都道府県×月別の需要変動係数（宿泊単価に乗算）",
    priority: "high",
  },
  {
    name: "working-days-shinpou.csv",
    displayName: "稼働日数（民泊新法）",
    description: "都道府県×月別の稼働予測日数（年間180日制限適用時）",
    priority: "high",
  },
  {
    name: "working-days-normal.csv",
    displayName: "稼働日数（通常）",
    description: "都道府県×月別の稼働予測日数（民泊新法非適用時）",
    priority: "high",
  },
  {
    name: "base-price.csv",
    displayName: "基本宿泊単価",
    description: "都道府県×定員別の基本宿泊単価",
    priority: "medium",
  },
  {
    name: "expenses.csv",
    displayName: "固定費",
    description: "部屋数ティア別のゴミ処理費・インターネット費",
    priority: "medium",
  },
  {
    name: "building-age.csv",
    displayName: "築年数係数",
    description: "築年数区分×リノベーション有無の価格係数",
    priority: "low",
  },
  {
    name: "room-rank.csv",
    displayName: "水道光熱費ランク",
    description: "部屋面積ランク別の水道光熱費",
    priority: "low",
  },
  {
    name: "cleaning-price.csv",
    displayName: "清掃基準単価",
    description: "部屋ランク×ベッド数別の清掃単価（現在未使用）",
    priority: "low",
  },
] as const;

// 許可されたファイル名のリスト（セキュリティ対策）
const ALLOWED_FILES: string[] = CSV_FILES.map((f) => f.name);

// データディレクトリのパス
const getDataDir = () => join(process.cwd(), "src/app/pro/lib/data");

// ファイル名のバリデーション
function isValidFileName(fileName: string): boolean {
  return ALLOWED_FILES.includes(fileName);
}

// バックアップファイル名を生成
function getBackupFileName(fileName: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${fileName}.backup.${timestamp}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const fileName = url.searchParams.get("file");

    const dataDir = getDataDir();

    // ファイル一覧を取得
    if (action === "list") {
      const files = CSV_FILES.map((file) => {
        const filePath = join(dataDir, file.name);
        let lastModified = null;
        let rowCount = 0;

        if (existsSync(filePath)) {
          const stats = statSync(filePath);
          lastModified = stats.mtime.toISOString();

          // 行数をカウント
          const content = readFileSync(filePath, "utf-8");
          rowCount = content.split("\n").filter((line) => line.trim()).length;
        }

        return {
          ...file,
          lastModified,
          rowCount,
        };
      });

      return NextResponse.json({ files });
    }

    // 個別ファイルを取得
    if (fileName) {
      if (!isValidFileName(fileName)) {
        return NextResponse.json(
          { error: "無効なファイル名です" },
          { status: 400 }
        );
      }

      const filePath = join(dataDir, fileName);

      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: "ファイルが見つかりません" },
          { status: 404 }
        );
      }

      const content = readFileSync(filePath, "utf-8");
      const fileInfo = CSV_FILES.find((f) => f.name === fileName);
      const stats = statSync(filePath);

      return NextResponse.json({
        fileName,
        displayName: fileInfo?.displayName,
        description: fileInfo?.description,
        content,
        lastModified: stats.mtime.toISOString(),
      });
    }

    return NextResponse.json(
      { error: "actionまたはfileパラメータが必要です" },
      { status: 400 }
    );
  } catch (error) {
    console.error("CSV取得エラー:", error);
    return NextResponse.json(
      { error: "ファイルの読み込みに失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, content, createBackup = true } = body;

    // バリデーション
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "ファイル名が必要です" },
        { status: 400 }
      );
    }

    if (!isValidFileName(fileName)) {
      return NextResponse.json(
        { error: "無効なファイル名です" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "コンテンツが必要です" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（1MB制限）
    const contentSize = new Blob([content]).size;
    if (contentSize > 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズが1MBを超えています" },
        { status: 400 }
      );
    }

    const dataDir = getDataDir();
    const filePath = join(dataDir, fileName);

    // バックアップ作成
    let backupPath = null;
    if (createBackup && existsSync(filePath)) {
      const backupFileName = getBackupFileName(fileName);
      backupPath = join(dataDir, "backups", backupFileName);

      // backupsディレクトリがなければ作成
      const backupDir = join(dataDir, "backups");
      if (!existsSync(backupDir)) {
        const { mkdirSync } = await import("node:fs");
        mkdirSync(backupDir, { recursive: true });
      }

      copyFileSync(filePath, backupPath);
    }

    // ファイル書き込み
    writeFileSync(filePath, content, "utf-8");

    return NextResponse.json({
      success: true,
      message: "保存しました",
      backupPath: backupPath ? backupPath.replace(process.cwd(), "") : null,
    });
  } catch (error) {
    console.error("CSV保存エラー:", error);
    return NextResponse.json(
      { error: "ファイルの保存に失敗しました" },
      { status: 500 }
    );
  }
}
