# 民泊シミュレーション仕様書

## 目次
1. [概要](#1-概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [データ構造](#3-データ構造)
4. [計算ロジック詳細](#4-計算ロジック詳細)
5. [CSVマスターデータ](#5-csvマスターデータ)
6. [問題点と矛盾](#6-問題点と矛盾)
7. [改善ロードマップ](#7-改善ロードマップ)
8. [計算式まとめ](#8-計算式まとめ)

---

## 1. 概要

### 1.1 目的
民泊事業の収益シミュレーションを行い、3年間（36ヶ月）の売上・経費・利益を予測する。

### 1.2 主要機能
- 新規物件のシミュレーション
- 既存物件のシミュレーション
- CSVインポートによる一括シミュレーション
- 部屋タイプ別・月別の詳細分析
- チャートによる可視化

### 1.3 技術スタック
- Next.js 15 (App Router)
- TypeScript
- Recharts（チャート描画）
- TailwindCSS

---

## 2. システムアーキテクチャ

### 2.1 ファイル構成
```
src/app/pro/
├── lib/
│   ├── simulate.ts      # メインシミュレーションロジック（544行）
│   ├── types.ts         # 型定義
│   ├── csvUtils.ts      # CSVパースユーティリティ
│   ├── prefectures.ts   # 都道府県定数
│   ├── buildingAges.ts  # 築年数定数
│   ├── buildingTypes.ts # 建物タイプ定数
│   └── data/            # CSVマスターデータ
│       ├── base-price.csv
│       ├── working-days.csv
│       ├── monthly-index.csv
│       ├── building-age.csv
│       ├── room-rank.csv
│       ├── expenses.csv
│       └── cleaning-price.csv
└── results/
    ├── components/      # 結果表示コンポーネント
    └── hooks/           # シミュレーション実行フック
```

### 2.2 データフロー
```
ユーザー入力 → API経由CSVデータ取得 → simulate() → 結果オブジェクト → UIレンダリング
```

---

## 3. データ構造

### 3.1 入力データ（FormValues）
```typescript
interface FormValues {
  // 施設情報
  postalCode: string;          // 郵便番号
  prefectureId: string;        // 都道府県ID
  address1: string;            // 住所1
  address2: string;            // 住所2
  buildingAge: string;         // 築年数区分
  renovated: boolean;          // リノベーション済みフラグ
  rent: number;                // 家賃（月額）
  isLaw: boolean;              // 民泊新法適用フラグ

  // シミュレーション期間
  startMonth: number;          // 開始月
  startYear: number;           // 開始年
  months: number;              // シミュレーション月数

  // 部屋タイプ配列
  roomTypes: RoomType[];
}
```

### 3.2 部屋タイプ（RoomType）
```typescript
interface RoomType {
  capacity: number;            // 定員
  beds: number;                // ベッド数
  roomArea: number;            // 部屋面積（m²）
  count: number;               // 部屋数
  lodgingUnitPrice?: number;   // 宿泊単価（任意）
  cleaningUnitPrice?: number;  // 清掃単価（任意）
  consumablesPrice?: number;   // 消耗品単価（任意）
  avgStay?: number;            // 平均宿泊数（任意）
}
```

### 3.3 出力データ（SimulationResult）
```typescript
interface SimulationResult {
  // 全体集計
  totalResults: {
    totalRevenue: number;      // 総売上
    totalExpenses: number;     // 総経費
    profit: number;            // 利益
    occupancyRate: number;     // 稼働率
  };

  // 部屋タイプ別詳細
  roomResults: RoomResult[];

  // 期間情報
  periodInfo: {
    startMonth: number;
    startYear: number;
    months: number;
  };
}
```

---

## 4. 計算ロジック詳細

### 4.1 売上計算フロー

#### Step 1: 基準宿泊単価の決定
```typescript
// ユーザー入力があればそれを使用、なければテーブルから取得
const baseNightly = room.lodgingUnitPrice ?? getBasePriceFromTable(prefJa, capacity, beds);
```

#### Step 2: 実効宿泊単価の計算
```typescript
const nightlyPrice = baseNightly × monthlyIndex × buildingAgeIndex;
```

| 係数 | 説明 | 値の範囲 |
|------|------|----------|
| monthlyIndex | 月次変動係数 | 0.6〜1.78 |
| buildingAgeIndex | 築年数係数 | 0.80〜1.15 |

#### Step 3: 1部屋あたりの売上計算
```typescript
// 宿泊売上
const accommodationRevenueOne = workingDays × nightlyPrice;

// 清掃売上（宿泊回数分）
const cleaningRevenueOne = (workingDays / avgStay) × cleaningUnitPrice;

// 1部屋合計
const oneRoomRevenue = accommodationRevenueOne + cleaningRevenueOne;
```

#### Step 4: 成長率の適用
```typescript
function growthFactor(monthIndex: number): number {
  if (monthIndex >= 24) return 1.15;  // 25ヶ月目以降: +15%
  if (monthIndex >= 12) return 1.10;  // 13〜24ヶ月目: +10%
  return 1.00;                         // 1〜12ヶ月目: 基準
}

const typeRevenue = (oneRoomRevenue × roomCount) × growthFactor(monthIndex);
```

### 4.2 経費計算フロー

#### 変動費（部屋タイプ別・月別）
| 項目 | 計算式 | 備考 |
|------|--------|------|
| 運営委託費 | 売上 × 20% | OUTSOURCING_FEE_RATE |
| OTA手数料 | 売上 × 13% | OTA_FEE_RATE |
| 清掃費 | 部屋数 × 清掃単価 × (稼働日数/平均宿泊数) | |
| 消耗品費 | 部屋数 × 稼働日数 × 消耗品単価 | |
| 水道光熱費 | 面積ランク別月額 × 部屋数 | 固定値 |

#### 固定費（施設全体・月額）
| 項目 | 金額 | 備考 |
|------|------|------|
| 家賃 | ユーザー入力 | |
| システム料金 | ¥3,960 | ハードコード |
| タブレット料金 | ¥9,980 | ハードコード |
| ゴミ回収費 | ティア別 | expenses.csv参照 |
| インターネット費 | ティア別 | expenses.csv参照 |

#### ティア判定（全部屋数による）
| 部屋数 | ティアキー |
|--------|-----------|
| 1〜5室 | 1 |
| 6〜15室 | 6 |
| 16〜25室 | 16 |
| 26〜40室 | 26 |
| 41〜50室 | 41 |
| 51〜100室 | 51 |
| 100室以上 | 100 |

### 4.3 利益計算
```typescript
profit = totalRevenue - totalVariableCosts - (fixedCostPerMonth × months);
```

---

## 5. CSVマスターデータ

### 5.1 base-price.csv（基本宿泊単価）
- **キー**: 都道府県 × 定員数
- **特殊処理**: 定員2人の場合、ベッド数により「2ツイン」or「2ダブル」を参照
- **用途**: ユーザー入力がない場合のデフォルト値

### 5.2 working-days.csv（稼働日数）
- **キー**: 都道府県 × 月
- **値**: 7〜31日
- **用途**: 各月の稼働可能日数

### 5.3 monthly-index.csv（月次変動係数）
- **キー**: 都道府県 × 月
- **値**: 0.6〜1.78
- **用途**: 季節・地域による需要変動を反映

### 5.4 building-age.csv（築年数係数）
| 築年数区分 | リノベなし | リノベ済み |
|-----------|-----------|-----------|
| 新築〜4年 | 1.15 | 1.15 |
| 5〜15年 | 1.05 | 1.05 |
| 16〜40年 | 0.90 | 1.00 |
| 41年以上 | 0.80 | 0.95 |

### 5.5 room-rank.csv（水道光熱費）
| 面積（m²） | ランク | 月額 |
|-----------|--------|------|
| 1〜25 | A | ¥11,000 |
| 26〜40 | B | ¥26,000 |
| 41〜65 | C | ¥28,000 |
| 66〜100 | D | ¥38,000 |

### 5.6 expenses.csv（固定費）
- ゴミ回収費・インターネット費をティア別に定義

### 5.7 cleaning-price.csv（清掃基準単価）
- **現状**: 未使用（ユーザー入力に依存）
- **将来**: 面積ランク × ベッド数のマトリックスで自動設定

---

## 6. 問題点と矛盾

### 6.1 重大な問題（P0）

#### 問題1: 稼働率計算の矛盾
**現状のコード:**
```typescript
const totalWorkingDays = monthWindow.reduce((sum, { month1 }) => {
  return sum + workingDaysTable.get(prefJa)[MONTHS_JA[month1 - 1]];
}, 0);

const maxPossibleDays = monthWindow.reduce((sum, { month1 }) => {
  return sum + workingDaysTable.get(prefJa)[MONTHS_JA[month1 - 1]];
}, 0);

const occupancyRate = (totalWorkingDays / maxPossibleDays) * 100;
// 結果: 常に100%
```

**問題点:**
- 分子と分母が同一の値
- 稼働率が常に100%になる

**修正案:**
```typescript
const actualWorkingDays = /* 実際の稼働日数（予約ベース） */;
const maxPossibleDays = monthWindow.reduce((sum, { month1 }) => {
  return sum + getDaysInMonth(month1);  // 月の日数
}, 0);
const occupancyRate = (actualWorkingDays / maxPossibleDays) * 100;
```

#### 問題2: 清掃費の二重計上
**現状:**
- 売上側: `cleaningRevenueOne = (workingDays / avgStay) × cleaningUnit`
- 経費側: `cleaningCost = roomCount × cleaningUnit × (workingDays / avgStay)`

**問題点:**
- 同じ清掃費が売上と経費の両方に計上されている
- 清掃を宿泊者に請求する場合（売上）と、業者に支払う場合（経費）の区別が不明確

**修正案:**
- 清掃売上: 宿泊者への請求金額（ゲスト向け清掃料金）
- 清掃費: 清掃業者への支払い金額（実コスト）
- 両者を明確に分離し、異なる単価を設定可能にする

### 6.2 中程度の問題（P1）

#### 問題3: 月次変動係数の根拠不明
- 0.6〜1.78の幅広い値
- どのようなデータに基づいているか不明
- 検証・調整の仕組みがない

#### 問題4: 水道光熱費の季節変動なし
- 夏冬の冷暖房費用が考慮されていない
- 実際の稼働率に連動していない

### 6.3 軽度の問題（P2）

#### 問題5: cleaning-price.csv未使用
- CSVは存在するが、コード内で使用されていない
- テーブル活用か削除の判断が必要

#### 問題6: ハードコードされた定数
| 定数 | 値 | 場所 |
|------|-----|------|
| 運営委託費率 | 20% | line 22 |
| OTA手数料率 | 13% | line 23 |
| システム料金 | ¥3,960 | line 24 |
| タブレット料金 | ¥9,980 | line 25 |
| 成長率 | 1.0/1.1/1.15 | line 184-186 |
| 平均宿泊数デフォルト | 2.5泊 | line 298 |

#### 問題7: 民泊新法フラグの不完全な実装
- `isLaw`フラグは存在するが、稼働日数制限（180日）の計算に正しく反映されていない

---

## 7. 改善ロードマップ

### Phase 1: 重大バグ修正（優先度: 高）

| # | タスク | 影響度 | 工数 |
|---|--------|--------|------|
| 1-1 | 稼働率計算ロジックの修正 | 高 | 中 |
| 1-2 | 清掃費の売上/経費分離 | 高 | 中 |
| 1-3 | 民泊新法180日制限の実装 | 高 | 小 |

### Phase 2: データ品質向上（優先度: 中）

| # | タスク | 影響度 | 工数 |
|---|--------|--------|------|
| 2-1 | 月次変動係数の検証・ドキュメント化 | 中 | 大 |
| 2-2 | 水道光熱費の季節変動対応 | 中 | 中 |
| 2-3 | cleaning-price.csvの活用 or 削除 | 低 | 小 |

### Phase 3: 設定の柔軟化（優先度: 低）

| # | タスク | 影響度 | 工数 |
|---|--------|--------|------|
| 3-1 | 手数料率のCSV化/設定画面追加 | 低 | 中 |
| 3-2 | 成長率パラメータのテーブル化 | 低 | 小 |
| 3-3 | 固定費（システム/タブレット）の設定化 | 低 | 小 |

### Phase 4: 機能拡張（将来）

| # | タスク | 説明 |
|---|--------|------|
| 4-1 | 複数シナリオ比較機能 | 楽観/標準/悲観シナリオ |
| 4-2 | 感度分析機能 | パラメータ変化の影響分析 |
| 4-3 | 実績データ連携 | 予測vs実績の比較 |

---

## 8. 計算式まとめ

### 売上計算
```
【月別1部屋売上】
宿泊売上 = 稼働日数 × 基準単価 × 月次係数 × 築年数係数
清掃売上 = (稼働日数 ÷ 平均宿泊数) × 清掃単価
1部屋売上 = 宿泊売上 + 清掃売上

【月別部屋タイプ売上】
部屋タイプ売上 = 1部屋売上 × 部屋数 × 成長率
```

### 経費計算
```
【変動費（月別・部屋タイプ別）】
運営委託費 = 部屋タイプ売上 × 20%
OTA手数料 = 部屋タイプ売上 × 13%
清掃費 = 部屋数 × 清掃単価 × (稼働日数 ÷ 平均宿泊数)
消耗品費 = 部屋数 × 稼働日数 × 消耗品単価
水道光熱費 = 面積ランク別月額 × 部屋数

【固定費（月額・施設全体）】
固定費 = 家賃 + ¥3,960 + ¥9,980 + ゴミ回収費 + インターネット費
```

### 利益計算
```
総売上 = Σ(全月 × 全部屋タイプの売上)
総変動費 = Σ(全月 × 全部屋タイプの変動費)
総固定費 = 月額固定費 × シミュレーション月数
営業利益 = 総売上 - 総変動費 - 総固定費
```

---

## 付録: 定数一覧

```typescript
// 手数料率
const OUTSOURCING_FEE_RATE = 0.20;  // 運営委託費率 20%
const OTA_FEE_RATE = 0.13;          // OTA手数料率 13%

// 固定費
const SYSTEM_FEE = 3960;            // システム料金
const TABLET_FEE = 9980;            // タブレット料金

// 成長率
const GROWTH_RATES = {
  year1: 1.00,   // 1〜12ヶ月目
  year2: 1.10,   // 13〜24ヶ月目
  year3: 1.15    // 25ヶ月目以降
};

// デフォルト値
const DEFAULT_AVG_STAY = 2.5;       // 平均宿泊数

// 民泊新法
const MINPAKU_LAW_MAX_DAYS = 180;   // 年間稼働上限
```

---

*最終更新: 2026-01-16*
*作成者: Claude Opus 4.5*
