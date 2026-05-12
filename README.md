# minpakusim-pro

民泊事業の収益シミュレーションを行うWebアプリケーション（Pro版）。
3年間（36ヶ月）の売上・経費・利益を予測し、部屋タイプ別・月別の詳細分析とチャート可視化を提供します。

## 🌐 公開URL

- **Pro版（本リポジトリ）**: https://minpakusim-pro.vercel.app/pro
- **Simple版（別リポジトリ）**: https://minpakusim-simple-launch.vercel.app

## ✨ 主な機能

- 新規物件のシミュレーション（`/pro/new`）
- 既存物件のシミュレーション（`/pro/existing`）
- CSVインポートによる一括シミュレーション（`/pro/import`）
- 部屋タイプ別・月別の詳細分析
- Rechartsによるチャート可視化（`/pro/results`）
- 民泊新法（180日制限）の有無に応じた稼働日数の自動切替

## 🛠️ 技術スタック

| 領域 | 採用技術 |
|---|---|
| フレームワーク | Next.js 15（App Router） |
| 言語 | TypeScript |
| UI | TailwindCSS / Radix UI / lucide-react |
| フォーム | react-hook-form |
| チャート | Recharts |
| CSV解析 | PapaParse |
| デプロイ | Vercel |

## 🚀 セットアップ

### 必要環境

- Node.js 18 以上
- npm

### インストールと起動

```bash
# 依存関係インストール
npm install

# 開発サーバ起動（http://localhost:3000）
npm run dev

# 本番ビルド
npm run build

# 本番サーバ起動
npm run start

# Lint
npm run lint
```

### 環境変数

Pro版の動作には **環境変数は不要** です。

> 注: `src/app/api/send-email/route.ts` には `RESEND_API_KEY` を参照するコードが残っていますが、Pro配下のどこからも呼ばれていない孤立した API です。詳細は [`docs/REPO_AND_DEPLOYMENT_STATUS.md`](./docs/REPO_AND_DEPLOYMENT_STATUS.md) を参照。

## 📁 ディレクトリ構成

```
src/app/
├── api/                       # サーバーレス関数
│   ├── simulation-data/       # CSVデータ取得API
│   ├── address/               # 住所検索API
│   └── send-email/            # （Pro未使用・将来削除候補）
├── layout.tsx
├── page.tsx
└── pro/                       # Pro版本体
    ├── _components/           # 共通コンポーネント
    ├── new/                   # 新規物件シミュレーション
    ├── existing/              # 既存物件シミュレーション
    ├── import/                # CSVインポート
    ├── results/               # 結果表示・チャート
    └── lib/
        ├── simulate.ts        # メインシミュレーションロジック
        ├── types.ts           # 型定義
        ├── csvUtils.ts        # CSVパースユーティリティ
        └── data/              # CSVマスターデータ
```

## 📊 マスターデータ（CSV）

`src/app/pro/lib/data/` 配下にビルド時バンドルされる CSV ファイル。

| ファイル | 用途 |
|---|---|
| `base-price.csv` | 基本宿泊単価 |
| `working-days-shinpou.csv` | 稼働日数（民泊新法適用時） |
| `working-days-normal.csv` | 稼働日数（民泊新法非適用時） |
| `prefecture-month-index.csv` | 月次変動係数 |
| `building-age.csv` | 築年数係数 |
| `room-rank.csv` | 水道光熱費ランク |
| `cleaning-price.csv` | 清掃基準単価（規定値フォールバック） |
| `expenses.csv` | 固定費（ゴミ・インターネット） |

CSVデータを変更する場合はソースを直接編集し、コミットして push（Vercelが自動デプロイ）。詳細は [`docs/VERCEL_DEPLOYMENT_ANALYSIS.md`](./docs/VERCEL_DEPLOYMENT_ANALYSIS.md) を参照。

## 📚 ドキュメント

| ドキュメント | 内容 |
|---|---|
| [`docs/REPO_AND_DEPLOYMENT_STATUS.md`](./docs/REPO_AND_DEPLOYMENT_STATUS.md) | リポジトリ構成・公開URL・デプロイ整理の経緯 |
| [`docs/SIMULATION_SPECIFICATION.md`](./docs/SIMULATION_SPECIFICATION.md) | シミュレーション仕様書（計算ロジック詳細） |
| [`docs/LOGIC_CONTRADICTIONS.md`](./docs/LOGIC_CONTRADICTIONS.md) | ロジック矛盾の分析と修正状況 |
| [`docs/VERCEL_DEPLOYMENT_ANALYSIS.md`](./docs/VERCEL_DEPLOYMENT_ANALYSIS.md) | Vercel動作可否の技術分析 |

## 🚢 デプロイ

`main` ブランチへの push が Vercel プロジェクト `minpakusim-pro` に自動デプロイされます。

詳細な構成・経緯は [`docs/REPO_AND_DEPLOYMENT_STATUS.md`](./docs/REPO_AND_DEPLOYMENT_STATUS.md) を参照してください。

## 🔗 関連リポジトリ

| リポジトリ | 状態 | 説明 |
|---|---|---|
| [`0ne9uy/minpakusim-pro`](https://github.com/0ne9uy/minpakusim-pro) | ⭐ 現役 | 本リポジトリ（Pro版） |
| [`0ne9uy/minpakusim-simple`](https://github.com/0ne9uy/minpakusim-simple) | 現役 | Simple版 |
| [`0ne9uy/minpaku-sim`](https://github.com/0ne9uy/minpaku-sim) | 🗄️ アーカイブ | Pro/Simple 分離前の旧版 |

---

*Last updated: 2026-05-12*
