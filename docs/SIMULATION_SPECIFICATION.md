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
- PapaParse（CSV解析）

### 1.4 実装状況サマリー

| 機能 | 状態 | 備考 |
|------|------|------|
| 売上計算 | ✅ 完全実装 | 成長率適用含む |
| 経費計算 | ✅ 完全実装 | 変動費・固定費 |
| 稼働率計算 | ✅ 修正済み | カレンダー日数ベース |
| 民泊新法180日制限 | ✅ 実装済み | 年間按分対応 |
| 清掃費計算 | ⚠️ 部分実装 | CSVテーブル未使用 |
| 税金計算 | ❌ 未実装 | 消費税・源泉徴収なし |

---

## 2. システムアーキテクチャ

### 2.1 ファイル構成
```
src/app/pro/
├── lib/
│   ├── simulate.ts           # メインシミュレーションロジック（600行以上）
│   ├── types.ts              # 型定義
│   ├── csvUtils.ts           # CSVパースユーティリティ
│   ├── prefectures.ts        # 都道府県定数
│   ├── buildingAges.ts       # 築年数定数
│   ├── buildingTypes.ts      # 建物タイプ定数
│   └── data/                 # CSVマスターデータ
│       ├── base-price.csv          # ✅ 使用中
│       ├── working-days-shinpou.csv        # ✅ 使用中（民泊新法適用時）
│       ├── working-days-normal.csv # ✅ 使用中（民泊新法非適用時）
│       ├── prefecture-month-index.csv # ✅ 使用中（月次変動係数）
│       ├── monthly-index.csv       # ⚠️ 未使用（重複ファイル？）
│       ├── building-age.csv        # ✅ 使用中
│       ├── room-rank.csv           # ✅ 使用中
│       ├── expenses.csv            # ✅ 使用中
│       ├── cleaning-price.csv      # ❌ 未使用（API応答に含まれない）
│       └── occupancy-rate.csv      # ❌ 未使用
├── results/
│   ├── components/           # 結果表示コンポーネント
│   └── hooks/                # シミュレーション実行フック
└── data-management/          # データ管理機能（新規実装）
```

### 2.2 データフロー
```
┌─────────────────────────────────────────────────────────────────────┐
│ ユーザー入力（FormValues）                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API: /api/simulation-data                                           │
│ - base-price.csv                                                    │
│ - working-days-shinpou.csv / working-days-normal.csv (isLaw判定)            │
│ - prefecture-month-index.csv                                        │
│ - building-age.csv                                                  │
│ - room-rank.csv                                                     │
│ - expenses.csv                                                      │
│ ※ cleaning-price.csvは読み込むが応答に含めていない（バグ）           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ simulate() 関数                                                      │
│ - CSVデータをパース → Mapテーブル化                                   │
│ - 月ウィンドウ構築（期間計算）                                        │
│ - 部屋タイプ別×月別の売上・経費計算                                   │
│ - 成長率適用                                                         │
│ - 稼働率計算（民泊新法180日制限考慮）                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SimulationResult オブジェクト                                        │
│ - totalResults: 総売上・総経費・利益・稼働率                          │
│ - roomResults: 部屋タイプ別詳細                                       │
│ - periodInfo: 期間情報                                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ UI レンダリング（Recharts）                                          │
│ - 概要ダッシュボード                                                  │
│ - 売上チャート                                                       │
│ - 経費チャート                                                       │
│ - 利益チャート                                                       │
└─────────────────────────────────────────────────────────────────────┘
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
  months: number;              // シミュレーション月数（1〜36）

  // 部屋タイプ配列
  roomTypes: RoomType[];
}
```

### 3.2 部屋タイプ（RoomType）
```typescript
interface RoomType {
  capacity: number;            // 定員（1〜29人）
  beds: number;                // ベッド数
  roomArea: number;            // 部屋面積（m²）
  count: number;               // 部屋数
  lodgingUnitPrice?: number;   // 宿泊単価（任意、未指定時はCSVから取得）
  cleaningUnitPrice?: number;  // 清掃単価（任意）
  consumablesPrice?: number;   // 消耗品単価（任意）
  avgStay?: number;            // 平均宿泊数（任意、デフォルト2.5泊）
}
```

### 3.3 出力データ（SimulationResult）
```typescript
interface SimulationResult {
  // 全体集計
  totalResults: {
    totalRevenue: number;      // 総売上
    totalExpenses: number;     // 総経費
    profit: number;            // 営業利益
    occupancyRate: number;     // 稼働率（%）
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

interface RoomResult {
  // 基本情報
  roomType: RoomType;

  // 月別売上詳細
  monthlyRevenues: {
    label: string;             // "2026年1月"形式
    accommodationRevenue: number;
    cleaningRevenue: number;
    totalRevenue: number;
  }[];

  // 月別経費詳細
  monthlyExpenses: {
    label: string;
    outsourcing: number;       // 運営委託費
    otaFee: number;            // OTA手数料
    cleaning: number;          // 清掃費
    consumables: number;       // 消耗品費
    waterElectricity: number;  // 水道光熱費
    total: number;
  }[];

  // 集計値
  totalRevenue: number;
  totalExpenses: number;
  occupancyRate: number;       // 全部屋タイプで同一値
}
```

---

## 4. 計算ロジック詳細

### 4.1 売上計算フロー

#### Step 1: 基準宿泊単価の決定
```typescript
// ユーザー入力があればそれを使用、なければテーブルから取得
const baseNightly = room.lodgingUnitPrice ?? getBasePriceFromTable(prefJa, capacity, beds);

// テーブル検索ロジック
function getBasePriceFromTable(prefJa, capacity, beds) {
  const row = basePriceTable.get(prefJa);
  if (capacity === 2) {
    // 定員2人はベッド構成で列を分岐
    return beds === 1 ? row["2ダブル"] : row["2ツイン"];
  }
  return row[String(capacity)];
}
```

#### Step 2: 実効宿泊単価の計算
```typescript
const nightlyPrice = baseNightly × monthlyIndex × buildingAgeIndex;
```

| 係数 | 説明 | 値の範囲 | データソース |
|------|------|----------|-------------|
| monthlyIndex | 月次変動係数 | 0.6〜1.78 | prefecture-month-index.csv |
| buildingAgeIndex | 築年数係数 | 0.80〜1.15 | building-age.csv |

#### Step 3: 1部屋あたりの売上計算
```typescript
// 稼働日数の取得（民泊新法180日制限適用後）
const workingDays = effectiveWorkingDaysMap.get(monthLabel);

// 宿泊売上
const accommodationRevenueOne = workingDays × nightlyPrice;

// 清掃回数（= チェックアウト回数）
const cleaningCount = workingDays / avgStay;

// 清掃売上（ゲストから受け取る清掃料金）
const cleaningRevenueOne = cleaningCount × cleaningUnitPrice;

// 1部屋合計
const oneRoomRevenue = accommodationRevenueOne + cleaningRevenueOne;
```

#### Step 4: 成長率の適用
```typescript
function growthFactor(monthIndexFromStart: number): number {
  if (monthIndexFromStart >= 24) return 1.15;  // 25ヶ月目以降: +15%
  if (monthIndexFromStart >= 12) return 1.10;  // 13〜24ヶ月目: +10%
  return 1.00;                                  // 1〜12ヶ月目: 基準
}

// 成長率を売上に適用
const typeRevenue = (oneRoomRevenue × roomCount) × growthFactor(monthIndex);

// ⚠️ 注意: 成長率は売上だけでなく、売上連動の経費（OTA手数料等）にも影響
```

### 4.2 経費計算フロー

#### 変動費（部屋タイプ別・月別）
| 項目 | 計算式 | 料率/単価 | 備考 |
|------|--------|----------|------|
| 運営委託費 | 売上 × 20% | OUTSOURCING_FEE_RATE = 0.20 | ハードコード |
| OTA手数料 | 売上 × 13% | OTA_FEE_RATE = 0.13 | ハードコード |
| 清掃費 | 部屋数 × 清掃単価 × 清掃回数 | ユーザー入力 | ⚠️ CSVテーブル未使用 |
| 消耗品費 | 部屋数 × 稼働日数 × 消耗品単価 | ユーザー入力 | |
| 水道光熱費 | 面積ランク別月額 × 部屋数 | room-rank.csv | 季節変動なし |

```typescript
// 変動費計算
const outsourcingFee = Math.round(typeRevenue * OUTSOURCING_FEE_RATE);
const otaFee = Math.round(typeRevenue * OTA_FEE_RATE);
const cleaningCost = Math.round(roomCount * cleaningUnit * cleaningCount);
const consumablesCost = Math.round(roomCount * workingDays * consumablesUnit);
const waterElectricity = waterCostPerRoom * roomCount;
```

#### 固定費（施設全体・月額）
| 項目 | 金額 | 備考 |
|------|------|------|
| 家賃 | ユーザー入力 | facility.rent |
| システム料金 | ¥3,960 | SYSTEM_FEE（ハードコード） |
| タブレット料金 | ¥9,980 | CHECKIN_TABLET_COST（ハードコード） |
| ゴミ回収費 | ティア別 | expenses.csv参照 |
| インターネット費 | ティア別 | expenses.csv参照 |

```typescript
// 固定費計算
const fixedCostPerMonth = rent + SYSTEM_FEE + CHECKIN_TABLET_COST + trashFee + internetFee;
const totalFixedCosts = fixedCostPerMonth × simulationMonths;
```

#### ティア判定（全部屋数による）
| 部屋数 | ティアキー | ゴミ回収費/月 | インターネット費/月 |
|--------|-----------|-------------|-------------------|
| 1〜5室 | 1 | expenses.csvから取得 | expenses.csvから取得 |
| 6〜15室 | 6 | 〃 | 〃 |
| 16〜25室 | 16 | 〃 | 〃 |
| 26〜40室 | 26 | 〃 | 〃 |
| 41〜50室 | 41 | 〃 | 〃 |
| 51〜100室 | 51 | 〃 | 〃 |
| 100室以上 | 100 | 〃 | 〃 |

```typescript
// ティア判定ロジック
function getTierKey(totalRoomCount: number): number {
  const tiers = [
    { max: 5, key: 1 },
    { max: 15, key: 6 },
    { max: 25, key: 16 },
    { max: 40, key: 26 },
    { max: 50, key: 41 },
    { max: 100, key: 51 },
  ];
  for (const t of tiers) {
    if (totalRoomCount <= t.max) return t.key;
  }
  return 100;
}
```

### 4.3 稼働率計算

#### 民泊新法適用時（isLaw = true）
```typescript
// 年間180日制限を月ごとに按分
const MINPAKU_LAW_MAX_DAYS = 180;

function calculateEffectiveWorkingDays(
  monthWindow,
  workingDaysTable,
  prefJa,
  isLaw
): Map<string, number> {
  // 年ごとに稼働日数を集計
  const yearlyDays = new Map<number, { months: [], rawTotal: number }>();

  for (const month of monthWindow) {
    const rawDays = workingDaysTable.get(prefJa)?.[month.month1];
    // 年ごとに集計...
  }

  // 各年で180日上限を適用
  for (const [year, data] of yearlyDays) {
    if (data.rawTotal > annualLimit) {
      const scaleFactor = annualLimit / data.rawTotal;
      // 各月を按分
    }
  }

  return effectiveWorkingDaysMap;
}
```

#### 稼働率計算式
```typescript
// 実際の稼働日数（180日制限適用後）
const totalEffectiveWorkingDays = monthWindow.reduce((sum, { label }) => {
  return sum + (effectiveWorkingDaysMap.get(label) ?? 0);
}, 0);

// 期間中のカレンダー日数
const totalCalendarDays = monthWindow.reduce((sum, { year, month1 }) => {
  return sum + getDaysInMonth(year, month1);
}, 0);

// 稼働率計算
// - 民泊新法適用: 実効稼働日数 ÷ 年間上限（180日按分）
// - 民泊新法非適用: 実効稼働日数 ÷ カレンダー日数
const maxPossibleDays = isLaw ? annualLimitDays : totalCalendarDays;
const occupancyRate = Math.min((totalEffectiveWorkingDays / maxPossibleDays) * 100, 100);
```

### 4.4 利益計算
```typescript
// 総売上
const totalRevenue = roomResults.reduce((sum, r) => sum + r.totalRevenue, 0);

// 総変動費
const totalVariableCosts = roomResults.reduce((sum, r) => sum + r.totalExpenses, 0);

// 総固定費
const totalFixedCosts = fixedCostPerMonth × simulationMonths;

// 営業利益
const profit = totalRevenue - totalVariableCosts - totalFixedCosts;
```

---

## 5. CSVマスターデータ

### 5.1 データファイル一覧

| ファイル名 | 状態 | 用途 | 問題点 |
|-----------|------|------|--------|
| base-price.csv | ✅ 使用中 | 都道府県×定員別の基本宿泊単価 | なし |
| working-days-shinpou.csv | ✅ 使用中 | 民泊新法適用時の稼働日数 | 命名が紛らわしい |
| working-days-normal.csv | ✅ 使用中 | 民泊新法非適用時の稼働日数 | 命名が紛らわしい |
| prefecture-month-index.csv | ✅ 使用中 | 月次変動係数 | なし |
| monthly-index.csv | ❌ 未使用 | 重複？ | 削除を検討 |
| building-age.csv | ✅ 使用中 | 築年数係数 | なし |
| room-rank.csv | ✅ 使用中 | 水道光熱費（面積ランク別） | 季節変動なし |
| expenses.csv | ✅ 使用中 | ゴミ回収費・インターネット費 | なし |
| cleaning-price.csv | ❌ 未使用 | 清掃単価テーブル | **API応答に含まれない（バグ）** |
| occupancy-rate.csv | ❌ 未使用 | 事前計算済み稼働率？ | 用途不明 |

### 5.2 base-price.csv（基本宿泊単価）
```csv
,エリア,物価係数,1singleBP,1,2ダブル,2ツイン,3,4,...,20
北海道,北海道,1.011,7600,7680,9180,10680,13180,15680,...,55680
青森県,東北,0.983,6800,6680,8180,9680,12180,14680,...,54680
...
```

- **キー**: 都道府県名（第1列）
- **値**: 定員数に対応する列の値
- **特殊処理**: 定員2人の場合、ベッド数1なら「2ダブル」、それ以外は「2ツイン」を参照

### 5.3 working-days-shinpou.csv / working-days-normal.csv

**working-days-shinpou.csv**（民泊新法適用時）:
```csv
,1,2,3,4,5,6,7,8,9,10,11,12
北海道,10,9,11,13,17,18,19,20,17,14,11,10
...
```

**working-days-normal.csv**（民泊新法非適用時）:
```csv
,1,2,3,4,5,6,7,8,9,10,11,12
北海道,16,14,17,20,24,25,26,27,24,21,18,16
...
```

- **命名の問題**: 「normal」が「民泊新法非適用」を意味するのは直感的でない
- **推奨**: `working-days-with-law.csv` / `working-days-without-law.csv` など

### 5.4 prefecture-month-index.csv（月次変動係数）
```csv
,1,2,3,4,5,6,7,8,9,10,11,12
北海道,0.9,0.8,0.9,1.1,1.3,1.4,1.5,1.6,1.3,1.1,0.9,0.9
...
沖縄県,1.2,1.3,1.4,1.2,1.1,1.0,1.5,1.78,1.3,1.1,1.0,1.1
```

- **値の範囲**: 0.6〜1.78
- **課題**: 値の根拠・算出方法が不明

### 5.5 building-age.csv（築年数係数）
```csv
築年数,リノベなし,リノベあり
新築〜4年,1.15,1.15
5〜15年,1.05,1.05
16〜40年,0.9,1.0
41年以上,0.8,0.95
```

| 築年数区分 | リノベなし | リノベ済み |
|-----------|-----------|-----------|
| 新築〜4年 | 1.15 | 1.15 |
| 5〜15年 | 1.05 | 1.05 |
| 16〜40年 | 0.90 | 1.00 |
| 41年以上 | 0.80 | 0.95 |

### 5.6 room-rank.csv（水道光熱費）
```csv
ランク,面積下限,面積上限,定員下限,定員上限,月額
A,1,25,1,4,11000
B,26,40,1,5,26000
C,41,65,2,7,28000
D,66,100,3,29,38000
```

| 面積（m²） | ランク | 月額 |
|-----------|--------|------|
| 1〜25 | A | ¥11,000 |
| 26〜40 | B | ¥26,000 |
| 41〜65 | C | ¥28,000 |
| 66〜100 | D | ¥38,000 |

### 5.7 expenses.csv（固定費ティア別）
```csv
rooms,trash,internet
1,5000,3000
6,8000,5000
16,12000,8000
26,18000,12000
41,25000,15000
51,35000,20000
100,50000,30000
```

### 5.8 cleaning-price.csv（清掃基準単価）⚠️ 未使用
```csv
,1,2ダブル,2ツイン,3,4,...
A,2500,3000,3500,4000,4500,...
B,3000,3500,4000,4500,5000,...
C,3500,4000,4500,5000,5500,...
D,4000,4500,5000,5500,6000,...
```

- **現状**: ファイルは存在するが、APIが応答に含めていないため未使用
- **原因**: `/api/simulation-data/route.ts` でファイルを読み込むが、JSONレスポンスに含めていない

```typescript
// route.ts line 24 - ファイルは読んでいる
const cleaningCsvText = readFileSync(join(proDataDir, "cleaning-price.csv"), "utf-8");

// しかし、レスポンスに含めていない（バグ）
return NextResponse.json({
  baseCsvText,
  workingDaysCsvText,
  indexCsvText,
  rankCsvText,
  // cleaningCsvText ← 欠落！
  expensesCsvText,
  buildingAgeData,
});
```

---

## 6. 問題点と矛盾

### 6.1 重大な問題（P0）

#### 問題1: 稼働率計算の矛盾 ✅ 修正済み
**状態**: 修正完了

**旧コード（問題あり）:**
```typescript
// 分子と分母が同じ値で常に100%になっていた
const totalWorkingDays = monthWindow.reduce(...);
const maxPossibleDays = monthWindow.reduce(...); // 同じ計算
const occupancyRate = (totalWorkingDays / maxPossibleDays) * 100;
```

**新コード（修正後）:**
```typescript
// 実際の稼働日数（民泊新法適用時は制限後の値）
const totalEffectiveWorkingDays = monthWindow.reduce((sum, { label }) => {
  return sum + (effectiveWorkingDaysMap.get(label) ?? 0);
}, 0);

// 期間中のカレンダー日数（理論上の最大稼働可能日数）
const totalCalendarDays = monthWindow.reduce((sum, { year, month1 }) => {
  return sum + getDaysInMonth(year, month1);
}, 0);

// 民泊新法適用時は年間180日が上限
const maxPossibleDays = facility.isLaw ? annualLimitDays : totalCalendarDays;
const occupancyRate = Math.min((totalEffectiveWorkingDays / maxPossibleDays) * 100, 100);
```

#### 問題2: 清掃費の売上/経費の明確化 ✅ 修正済み
**状態**: コメントで明確化済み

- **清掃売上**: ゲストから受け取る清掃料金（売上として計上）
- **清掃費**: 清掃業者への支払い（経費として計上）
- 現時点では同額で計算（cleaningUnitPrice）

```typescript
// 清掃売上: ゲストから受け取る清掃料金（売上として計上）
const cleaningCount = workingDays / avgStay;
const cleaningRevenueOne = cleaningCount * cleaningUnit;

// 清掃費: 清掃業者への支払い（経費として計上）
// ※清掃売上と同額で計算（実際は業者との契約により異なる可能性あり）
const cleaningCost = Math.round(roomCount * cleaningUnit * cleaningCount);
```

**⚠️ 潜在的リスク**: 清掃売上単価と清掃費単価が連動しているため、どちらかを変更する場合は両方を更新する必要がある。

#### 問題3: 民泊新法180日制限 ✅ 実装済み
**状態**: 実装完了

```typescript
const MINPAKU_LAW_MAX_DAYS = 180; // 年間稼働上限日数

function calculateEffectiveWorkingDays(
  monthWindow,
  workingDaysTable,
  prefJa,
  isLaw
): Map<string, number> {
  if (!isLaw) {
    // 民泊新法非適用: CSVの稼働日数をそのまま使用
    return rawWorkingDaysMap;
  }

  // 民泊新法適用: 年間180日制限を適用
  // - 年をまたぐ場合は年ごとに180日制限
  // - シミュレーション期間が1年未満の場合は月数に応じて按分
  return limitedWorkingDaysMap;
}
```

### 6.2 中程度の問題（P1）

#### 問題4: cleaning-price.csv がAPI応答に含まれない 🆕
**状態**: 未修正（バグ）

**現象**:
- `/api/simulation-data/route.ts` でファイルを読み込んでいる
- しかし、NextResponse.json() の戻り値に含めていない
- そのため、simulate() 関数で清掃単価テーブルを使用できない

**影響**:
- 清掃単価は常にユーザー入力に依存
- 面積ランク×ベッド数の標準単価テーブルが活用されていない

**修正方法**:
```typescript
// /api/simulation-data/route.ts
return NextResponse.json({
  baseCsvText,
  workingDaysCsvText,
  indexCsvText,
  rankCsvText,
  cleaningCsvText,  // ← 追加
  expensesCsvText,
  buildingAgeData,
});
```

#### 問題5: 月次変動係数の根拠不明
**状態**: 未対応

- 0.6〜1.78の幅広い値
- どのようなデータに基づいているか不明
- 検証・調整の仕組みがない

**推奨対応**:
- データの出所をドキュメント化
- 実績データとの比較検証機能を追加
- 定期的な係数見直しプロセスを確立

#### 問題6: 水道光熱費の季節変動なし
**状態**: 未対応

- 夏冬の冷暖房費用が考慮されていない
- 固定の月額料金のみ

**推奨対応**:
- 季節係数の追加（例: 夏1.3倍、冬1.4倍）
- または、稼働日数に連動した変動費化

#### 問題7: 稼働率計算のロジック問題（非民泊新法時）🆕
**状態**: 要検討

**現象**:
- 非民泊新法時、稼働率 = 稼働日数 ÷ カレンダー日数
- 例: 12ヶ月で稼働日数合計120日、カレンダー日数365日 → 稼働率32.9%

**懸念**:
- 稼働率が低く見える（実際の「稼働可能日の稼働率」ではない）
- 「カレンダー日数ベースの稼働率」と「稼働可能日ベースの稼働率」の2種類が必要かもしれない

### 6.3 軽度の問題（P2）

#### 問題8: 未使用CSVファイルの存在
**状態**: 未対応

- `monthly-index.csv`: `prefecture-month-index.csv` と重複？
- `occupancy-rate.csv`: 用途不明

**推奨対応**: 不要なファイルは削除

#### 問題9: 成長率が経費にも影響
**状態**: 仕様確認中

**現象**:
- 成長率は売上に適用
- 売上連動経費（OTA手数料、運営委託費）も自動的に増加
- これは意図通りか？

**考察**:
- 売上増 → OTA手数料増は正しい動作
- ただし、固定費（家賃等）は成長しない前提
- 長期では家賃更新による増加もあり得る

#### 問題10: ハードコードされた定数
**状態**: 未対応

| 定数 | 値 | 場所 | 推奨対応 |
|------|-----|------|---------|
| 運営委託費率 | 20% | simulate.ts:21 | CSV化 or 設定画面 |
| OTA手数料率 | 13% | simulate.ts:22 | CSV化 or 設定画面 |
| システム料金 | ¥3,960 | simulate.ts:23 | CSV化 or 設定画面 |
| タブレット料金 | ¥9,980 | simulate.ts:24 | CSV化 or 設定画面 |
| 成長率 | 1.0/1.1/1.15 | simulate.ts:189-193 | テーブル化 |
| 平均宿泊数デフォルト | 2.5泊 | simulate.ts:373 | CSV化 |
| 民泊新法上限 | 180日 | simulate.ts:25 | 定数として適切 |

#### 問題11: 税金計算の欠如 🆕
**状態**: 未実装

以下の税金が考慮されていない:
- 消費税（10%）
- 源泉徴収税（OTA経由の場合10.21%）
- 住民税・事業税

#### 問題12: キャンセル・空室リスクの未考慮 🆕
**状態**: 未実装

- 稼働日数はCSVの値をそのまま使用
- キャンセル率や予期せぬ空室を考慮していない
- 「信頼性係数」パラメータの追加を検討

---

## 7. 改善ロードマップ

### Phase 1: 重大バグ修正（優先度: 高）✅ 完了

| # | タスク | 影響度 | 工数 | 状態 |
|---|--------|--------|------|------|
| 1-1 | 稼働率計算ロジックの修正 | 高 | 中 | ✅ 完了 |
| 1-2 | 清掃費の売上/経費明確化 | 高 | 中 | ✅ 完了 |
| 1-3 | 民泊新法180日制限の実装 | 高 | 小 | ✅ 完了 |

### Phase 2: データ品質向上（優先度: 高）

| # | タスク | 影響度 | 工数 | 状態 |
|---|--------|--------|------|------|
| 2-1 | cleaning-price.csvをAPI応答に追加 | 高 | 小 | 🔲 未着手 |
| 2-2 | 不要CSVファイルの整理 | 低 | 小 | 🔲 未着手 |
| 2-3 | working-daysファイルの命名改善 | 低 | 小 | 🔲 未着手 |

### Phase 3: 機能改善（優先度: 中）

| # | タスク | 影響度 | 工数 | 状態 |
|---|--------|--------|------|------|
| 3-1 | 月次変動係数の検証・ドキュメント化 | 中 | 大 | 🔲 未着手 |
| 3-2 | 水道光熱費の季節変動対応 | 中 | 中 | 🔲 未着手 |
| 3-3 | 清掃単価テーブル参照機能の実装 | 中 | 中 | 🔲 未着手 |

### Phase 4: 設定の柔軟化（優先度: 低）

| # | タスク | 影響度 | 工数 | 状態 |
|---|--------|--------|------|------|
| 4-1 | 手数料率のCSV化/設定画面追加 | 低 | 中 | 🔲 未着手 |
| 4-2 | 成長率パラメータのテーブル化 | 低 | 小 | 🔲 未着手 |
| 4-3 | 固定費（システム/タブレット）の設定化 | 低 | 小 | 🔲 未着手 |

### Phase 5: 機能拡張（将来）

| # | タスク | 説明 | 状態 |
|---|--------|------|------|
| 5-1 | 複数シナリオ比較機能 | 楽観/標準/悲観シナリオ | 🔲 未着手 |
| 5-2 | 感度分析機能 | パラメータ変化の影響分析 | 🔲 未着手 |
| 5-3 | 実績データ連携 | 予測vs実績の比較 | 🔲 未着手 |
| 5-4 | 税金計算機能 | 消費税・源泉徴収の考慮 | 🔲 未着手 |
| 5-5 | キャンセル率考慮 | 信頼性係数の導入 | 🔲 未着手 |

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

【成長率】
1〜12ヶ月目: 1.00（基準）
13〜24ヶ月目: 1.10（+10%）
25ヶ月目以降: 1.15（+15%）
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

### 稼働率計算
```
【民泊新法適用時】
年間上限 = 180日（シミュレーション期間が1年未満の場合は按分）
実効稼働日数 = min(CSV稼働日数合計, 年間上限)
稼働率 = (実効稼働日数 ÷ 年間上限) × 100

【民泊新法非適用時】
実効稼働日数 = CSV稼働日数合計
カレンダー日数 = シミュレーション期間の総日数
稼働率 = (実効稼働日数 ÷ カレンダー日数) × 100
```

---

## 付録A: 定数一覧

```typescript
// 手数料率
const OUTSOURCING_FEE_RATE = 0.20;  // 運営委託費率 20%
const OTA_FEE_RATE = 0.13;          // OTA手数料率 13%

// 固定費
const SYSTEM_FEE = 3960;            // システム料金（予約管理システム）
const CHECKIN_TABLET_COST = 9980;   // チェックインタブレット料金

// 成長率
const GROWTH_RATES = {
  year1: 1.00,   // 1〜12ヶ月目
  year2: 1.10,   // 13〜24ヶ月目
  year3: 1.15    // 25ヶ月目以降
};

// デフォルト値
const DEFAULT_AVG_STAY = 2.5;       // 平均宿泊数（日）

// 民泊新法
const MINPAKU_LAW_MAX_DAYS = 180;   // 年間稼働上限（日）
```

---

## 付録B: エッジケース対応

| ケース | 入力例 | 処理 | 結果 |
|--------|--------|------|------|
| 稼働日数0 | 特定月の稼働0日 | 売上0、固定費のみ発生 | 赤字月 |
| 部屋数0 | roomTypes=[] | 売上0、固定費のみ発生 | 大幅赤字 |
| 平均宿泊数0 | avgStay=0 | デフォルト2.5日に置換 | 正常計算 |
| 極端な単価 | ¥1,000,000/泊 | そのまま計算 | 高額売上（妥当性チェックなし） |
| 家賃0 | rent=0 | 固定費から家賃除外 | 自己所有物件想定 |
| 36ヶ月超 | months=48 | 36ヶ月に制限 | 3年分のみ計算 |

---

## 付録C: パフォーマンス特性

- **計算量**: O(n × m) where n=部屋タイプ数, m=月数
  - 最大: 20部屋タイプ × 36ヶ月 = 720イテレーション
  - 実行時間: < 1ms（クライアントサイド）
- **メモリ使用量**: CSVデータ約500KB + 計算結果約10KB
- **キャッシュ**: なし（毎回APIからCSVを取得）

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2026-01-16 | v1.2 | 詳細調査に基づく全面更新: 新規問題の追加、CSVファイル状態の明確化、改善ロードマップ更新 |
| 2026-01-16 | v1.1 | 重大バグ修正: 稼働率計算、清掃費明確化、民泊新法180日制限実装 |
| 2026-01-16 | v1.0 | 初版作成 |

---

*最終更新: 2026-01-16*
*作成者: Claude Opus 4.5*
