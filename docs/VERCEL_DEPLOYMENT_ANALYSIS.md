# Vercelデプロイメント分析レポート

## 調査日
2026-01-16（最終更新）

## 調査目的
現在のシミュレーション実装が、Vercel等で動作するかの確認

---

## 調査結果サマリー

### ✅ Vercelで動作する
現在の実装は**Vercelで問題なく動作します**。

### 現在のアーキテクチャ
- **シミュレーション計算**: クライアントサイド（ブラウザ）で実行
- **CSVデータ取得**: サーバーレス関数（APIルート）経由
- **メール送信**: サーバーレス関数（APIキー保護のため）
- **住所検索**: サーバーレス関数（外部API連携）

---

## 詳細分析

### 1. 使用されているAPIルート

| APIルート | 用途 | サーバーサイド機能 | Vercel対応 |
|----------|------|------------------|-----------|
| `/api/simulation-data` | CSVデータ取得 | `readFileSync` | ✅ 対応 |
| `/api/send-email` | メール送信 | Resend API呼び出し | ✅ 対応 |
| `/api/address` | 住所検索 | 外部API呼び出し | ✅ 対応 |

### 2. シミュレーションデータ取得フロー

```
クライアント（ブラウザ）
  ↓ fetch('/api/simulation-data?isLaw=true')
APIルート（サーバーレス関数）
  ↓ readFileSync() でファイルシステムから読み込み
CSVファイル（src/app/pro/lib/data/*.csv）
  ↓ JSON形式で返却
クライアント（ブラウザ）
  ↓ simulate() 関数で計算実行
```

#### 実装箇所
- **APIルート**: `src/app/api/simulation-data/route.ts`
  - `readFileSync`を使用してファイルシステムからCSVを読み込む
  - 民泊新法適用フラグに応じて異なるCSVファイルを選択
  - 7つのCSVファイルを読み込んでJSON形式で返却

- **クライアント側**: `src/app/pro/lib/simulate.ts`
  ```typescript
  const apiUrl = `/api/simulation-data?isLaw=${facility.isLaw}`;
  const [simRes] = await Promise.all([fetch(apiUrl)]);
  const {
    baseCsvText,
    workingDaysCsvText,
    indexCsvText,
    rankCsvText,
    cleaningCsvText,
    expensesCsvText,
    buildingAgeData,
  } = await simRes.json();
  ```

### 3. 読み込まれているCSVファイル

```
src/app/pro/lib/data/
├── base-price.csv              # 基本宿泊単価
├── working-days-shinpou.csv    # 稼働日数（民泊新法適用）
├── working-days-normal.csv     # 稼働日数（民泊新法非適用）
├── prefecture-month-index.csv  # 月次変動係数
├── building-age.csv            # 築年数係数
├── room-rank.csv               # 水道光熱費ランク
├── cleaning-price.csv          # 清掃基準単価
└── expenses.csv                # 固定費（ゴミ・インターネット）
```

### 4. クライアントサイド計算

- **場所**: `src/app/pro/lib/simulate.ts`
- **実行環境**: ブラウザ（クライアントサイド）
- **依存関係**:
  - PapaParse（CSVパース）: ✅ クライアントサイド対応
  - 計算ロジック: ✅ 完全にクライアントサイド

---

## 削除された機能

### CSVファイル管理機能（削除済み）

以下の機能は**永続的なデータ保存ができない**ため削除されました：

| 削除された項目 | 理由 |
|--------------|------|
| `/api/csv-management` | Vercelではファイル書き込みが永続化されない |
| `/pro/data-management` UI | 保存機能が動作しないため不要 |
| CSVエディタコンポーネント | 上記に伴い不要 |

#### 削除の理由
1. **Vercelのファイルシステム制限**
   - サーバーレス関数内でのファイル書き込みは一時的なストレージのみ
   - 関数の実行終了後にデータは失われる

2. **localStorage/IndexedDBの限界**
   - ブラウザのキャッシュクリアでデータが消失
   - 永続的な保存先として信頼できない

3. **シンプルさの優先**
   - CSVデータの更新はソースコードを編集して再デプロイ
   - これが最も確実で永続的な方法

---

## Vercelでの動作確認

### ✅ 動作する理由

1. **Next.js 15のApp Router**
   - APIルートは自動的にサーバーレス関数としてデプロイされる
   - VercelはNext.jsを完全サポート

2. **ファイルシステムアクセス（読み込みのみ）**
   - ビルド時にファイルがバンドルに含まれる
   - サーバーレス関数実行時に`readFileSync`でアクセス可能

3. **環境変数**
   - `RESEND_API_KEY`などの環境変数はVercelの環境変数設定で管理可能

### 実行時間・メモリ制限

| 項目 | Vercel無料プラン | 現在の実装 |
|------|----------------|-----------|
| 実行時間 | 10秒 | ✅ 問題なし（数ミリ秒） |
| メモリ | 1024MB | ✅ 問題なし（CSVは合計500KB程度） |

---

## CSVデータ更新方法

CSVデータを変更する場合は、ソースコードを直接編集して再ビルド・再デプロイします：

```bash
# 1. CSVファイルを編集
vim src/app/pro/lib/data/base-price.csv

# 2. ローカルで動作確認
npm run build
npm run start

# 3. デプロイ
git add .
git commit -m "Update CSV data"
git push  # Vercel等で自動デプロイ
```

---

## 将来の拡張オプション

### 完全クライアントサイド化（未実装）

CSVデータをビルド時にバンドルに含める方式も可能です：

**メリット**:
- サーバーレス関数不要
- コールドスタートなし
- 静的サイトとしてデプロイ可能

**デメリット**:
- バンドルサイズが増加
- 変更時は再ビルドが必要

この実装は必要に応じて将来検討可能です。

---

## 関連ファイル

### APIルート
- `src/app/api/simulation-data/route.ts` - CSVデータ取得
- `src/app/api/send-email/route.ts` - メール送信
- `src/app/api/address/route.ts` - 住所検索

### クライアント側
- `src/app/pro/lib/simulate.ts` - シミュレーション計算
- `src/app/pro/results/page.tsx` - 結果表示

### 設定ファイル
- `vercel.json` - Vercel設定
- `next.config.ts` - Next.js設定
- `package.json` - 依存関係

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-01-16 | CSVファイル管理機能（/api/csv-management, /pro/data-management）を削除 |
| 2026-01-16 | 初版作成 |

---

*最終更新: 2026-01-16*
