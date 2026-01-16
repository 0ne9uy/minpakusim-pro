# シミュレーションロジック矛盾点 詳細解説

このドキュメントでは、民泊シミュレーションのロジックに存在する矛盾点と問題点を、具体的なコード例とともに解説します。

---

## 目次

1. [重大な問題（今すぐ修正が必要）](#1-重大な問題今すぐ修正が必要)
2. [中程度の問題（機能に影響）](#2-中程度の問題機能に影響)
3. [軽度の問題（改善推奨）](#3-軽度の問題改善推奨)
4. [設計上の懸念事項](#4-設計上の懸念事項)

---

## 1. 重大な問題（今すぐ修正が必要）

### 1.1 稼働日数CSVファイルの選択ロジックが逆転している

**発見場所**: `/src/app/api/simulation-data/route.ts` 18-20行目

**問題の内容**:

民泊新法適用フラグ（isLaw）に基づいてCSVファイルを選択するロジックが逆になっています。

```typescript
// 現在のコード（問題あり）
const workingDaysFileName = isLaw ? "working-days-normal.csv" : "working-days-shinpou.csv";
```

**CSVファイルの実際の内容**:

| ファイル | 北海道・8月の稼働日数 | 年間合計（概算） |
|----------|---------------------|-----------------|
| working-days-shinpou.csv | 15日 | 約130日 |
| working-days-normal.csv | 25日 | 約213日 |

**矛盾の説明**:

- `working-days-shinpou.csv` → 稼働日数が**少ない**（年間約130日）
- `working-days-normal.csv` → 稼働日数が**多い**（年間約213日）

しかし、ロジックでは：
- `isLaw = true`（民泊新法適用 = 180日制限あり）の時に、**多い方**のファイルを使用
- `isLaw = false`（民泊新法非適用 = 制限なし）の時に、**少ない方**のファイルを使用

これは明らかに逆です。

**正しいロジック**:

```typescript
// 修正版
const workingDaysFileName = isLaw ? "working-days-shinpou.csv" : "working-days-normal.csv";
```

**影響**:
- 民泊新法適用時に過大な売上予測
- 民泊新法非適用時に過小な売上予測
- 180日制限の計算が無意味になる（元の値がすでに低いため）

---

### 1.2 清掃単価CSVが受信されても使用されていない

**発見場所**:
- API: `/src/app/api/simulation-data/route.ts` 24行目、35行目
- シミュレーション: `/src/app/pro/lib/simulate.ts` 279-286行目

**問題の内容**:

APIは`cleaningCsvText`を返しているが、シミュレーション関数では受け取っていません。

```typescript
// API側（route.ts）- 返している
return NextResponse.json({
  baseCsvText,
  workingDaysCsvText,
  indexCsvText,
  rankCsvText,
  cleaningCsvText,  // ← 返している
  expensesCsvText,
  buildingAgeData,
});

// シミュレーション側（simulate.ts）- 受け取っていない
const {
  baseCsvText,
  workingDaysCsvText,
  indexCsvText,
  rankCsvText,
  // cleaningCsvText ← ここにない！
  expensesCsvText,
  buildingAgeData,
} = await simRes.json();
```

**影響**:
- `cleaning-price.csv`のデータが完全に無視される
- ユーザーが清掃単価を入力しない場合のデフォルト値がない
- 面積ランク×ベッド数に応じた適切な清掃単価が設定されない

**修正方法**:

```typescript
// simulate.ts の修正
const {
  baseCsvText,
  workingDaysCsvText,
  indexCsvText,
  rankCsvText,
  cleaningCsvText,  // 追加
  expensesCsvText,
  buildingAgeData,
} = await simRes.json();

// 清掃単価テーブルの作成と利用ロジックを追加
const cleaningRows = parseCsv(cleaningCsvText);
const cleaningUnit = room.cleaningUnitPrice ?? getCleaningPriceFromTable(cleaningRows, roomRank, beds);
```

---

## 2. 中程度の問題（機能に影響）

### 2.1 清掃費の売上と経費が連動している

**発見場所**: `/src/app/pro/lib/simulate.ts` 409-428行目

**問題の内容**:

清掃売上（ゲストからの収入）と清掃費（業者への支払い）が同じ単価を使用しています。

```typescript
// 清掃売上（売上として計上）
const cleaningRevenueOne = cleaningCount * cleaningUnit;

// 清掃費（経費として計上）
const cleaningCost = Math.round(roomCount * cleaningUnit * cleaningCount);
```

**具体例**:

| 項目 | 計算 | 金額 |
|------|------|------|
| 清掃単価 | - | ¥3,000 |
| 清掃回数/月 | 10日 ÷ 2.5泊 | 4回 |
| 清掃売上 | 4回 × ¥3,000 | +¥12,000 |
| 清掃費 | 4回 × ¥3,000 | -¥12,000 |
| **純利益への貢献** | | **¥0** |

**矛盾の説明**:

これ自体は「ゲストから受け取った清掃料金をそのまま業者に支払う」というビジネスモデルでは正しいですが：

1. 実際には清掃業者への支払いはゲストへの請求より安いことが多い
2. 現在の実装では清掃で利益を得ることが不可能
3. 「清掃売上 > 清掃費」で利益を出すビジネスモデルに対応できない

**推奨される修正**:

```typescript
// 2つの単価を分離
const cleaningRevenueUnit = room.cleaningRevenuePrice ?? 3000;  // ゲストへの請求額
const cleaningCostUnit = room.cleaningCostPrice ?? 2500;        // 業者への支払額

const cleaningRevenue = cleaningCount * cleaningRevenueUnit;
const cleaningCost = cleaningCount * cleaningCostUnit;
// 清掃利益 = ¥500 × 回数
```

---

### 2.2 稼働率の計算ロジックが直感的でない

**発見場所**: `/src/app/pro/lib/simulate.ts` 529-551行目

**問題の内容**:

民泊新法非適用時の稼働率計算が「カレンダー日数」を分母にしています。

```typescript
// 民泊新法非適用時
const maxPossibleDays = facility.isLaw ? annualLimitDays : totalCalendarDays;
const occupancyRate = (totalEffectiveWorkingDays / maxPossibleDays) * 100;
```

**具体例**（12ヶ月シミュレーション、民泊新法非適用）:

| 項目 | 値 |
|------|-----|
| CSVからの稼働日数合計 | 213日 |
| カレンダー日数 | 365日 |
| 計算される稼働率 | 213 ÷ 365 = **58.4%** |

**矛盾の説明**:

- ユーザーは「予約が入る可能性がある日のうち、何%が稼働したか」を期待する
- しかし実際は「1年のうち何%稼働したか」を計算している
- CSVの稼働日数がすでに「現実的な稼働見込み」を反映しているなら、稼働率は常に低く見える

**2つの解釈**:

1. **CSVの値 = 予測稼働日数**: この場合、稼働率は意味がない（予測値/最大値では比較にならない）
2. **CSVの値 = 稼働可能日数**: この場合、別途「実際の稼働率」が必要

**推奨される修正**:

```typescript
// 2種類の稼働率を計算
const calendarOccupancy = (workingDays / calendarDays) * 100;  // 年間稼働率
const potentialOccupancy = (workingDays / potentialDays) * 100; // 潜在稼働率
```

---

### 2.3 成長率が売上だけでなく経費にも影響

**発見場所**: `/src/app/pro/lib/simulate.ts` 419-429行目

**問題の内容**:

成長率は売上に適用されますが、OTA手数料と運営委託費は「成長後の売上」に対して計算されます。

```typescript
// 成長率を適用
const g = growthFactor(idx);
const typeRevenue = baseTypeRevenue * g;

// 変動費は成長後の売上に対して計算
const outsourcingFee = Math.round(typeRevenue * OUTSOURCING_FEE_RATE);
const otaFee = Math.round(typeRevenue * OTA_FEE_RATE);
```

**具体例**（25ヶ月目、成長率1.15）:

| 項目 | 1ヶ月目 | 25ヶ月目 | 増加率 |
|------|---------|---------|--------|
| 基準売上 | ¥1,000,000 | ¥1,000,000 | - |
| 成長後売上 | ¥1,000,000 | ¥1,150,000 | +15% |
| OTA手数料(13%) | ¥130,000 | ¥149,500 | +15% |
| 運営委託費(20%) | ¥200,000 | ¥230,000 | +15% |

**これは正しい動作か？**:

- **正しい場合**: OTA手数料は売上に連動するため、売上増加に比例して増加するのは当然
- **問題がある場合**: 成長率が「リピーター増加による直接予約増」を想定しているなら、OTA手数料率は下がるべき

**現状の評価**: 現在の実装は「OTAプラットフォーム経由の予約が一定割合」という前提では正しい。ただし、この前提を明示する必要がある。

---

## 3. 軽度の問題（改善推奨）

### 3.1 ファイル命名規則の混乱

**問題のファイル**:

| ファイル名 | 実際の内容 | 推奨名 |
|-----------|-----------|--------|
| `working-days-shinpou.csv` | 民泊新法適用時の稼働日数（少ない） | `working-days-with-law.csv` |
| `working-days-normal.csv` | 民泊新法非適用時の稼働日数（多い） | `working-days-without-law.csv` |
| ~~`monthly-index.csv`~~ | 削除済み | - |
| `prefecture-month-index.csv` | 実際に使用される月次変動係数 | `monthly-index.csv`に統一 |

**影響**:
- 開発者が混乱する
- バグの原因になりやすい
- 新しい開発者のオンボーディングが困難

---

### 3.2 ハードコードされた定数

**発見場所**: `/src/app/pro/lib/simulate.ts` 21-26行目

```typescript
const OUTSOURCING_FEE_RATE = 0.2;      // 20%
const OTA_FEE_RATE = 0.13;             // 13%
const SYSTEM_FEE = 3960;               // ¥3,960
const CHECKIN_TABLET_COST = 9980;      // ¥9,980
const MINPAKU_LAW_MAX_DAYS = 180;      // 180日
```

**問題点**:

1. 運営委託費率は契約により異なる（15%〜25%）
2. OTA手数料率はプラットフォームにより異なる（Airbnb: 3%〜5%ホスト負担、Booking.com: 15%等）
3. システム料金・タブレット料金は変更される可能性がある

**推奨される修正**:

```typescript
// 設定ファイルまたはCSVから読み込み
const config = {
  outsourcingFeeRate: facility.outsourcingFeeRate ?? 0.2,
  otaFeeRate: facility.otaFeeRate ?? 0.13,
  systemFee: facility.systemFee ?? 3960,
  tabletFee: facility.tabletFee ?? 9980,
};
```

---

### 3.3 水道光熱費の季節変動なし

**発見場所**: `/src/app/pro/lib/simulate.ts` 377行目

```typescript
const waterUnitPerMonth = getWaterUtilityCostForRoom(rankRows, N(room.roomArea, 0)) * roomCount;
```

**問題点**:

- 同じ金額が12ヶ月すべてに適用される
- 夏（冷房）・冬（暖房）の電気代増加が考慮されない
- 実際のコストと乖離する可能性

**推奨される修正**:

```typescript
// 季節係数を適用
const seasonFactor = getSeasonFactor(month1); // 1月: 1.4, 7月: 1.3, 4月: 1.0 など
const waterUnitPerMonth = baseWaterCost * seasonFactor * roomCount;
```

---

## 4. 設計上の懸念事項

### 4.1 税金計算の欠如

**現状**: 以下の税金が一切考慮されていません

| 税金 | 概要 | 影響 |
|------|------|------|
| 消費税（10%） | 宿泊料金に対して課税 | 売上の実質価値が10%低い |
| 源泉徴収税 | OTA経由の支払いから天引きされる場合がある | 入金額が予測より少ない |
| 住民税・事業税 | 利益に対して課税 | 手取り利益が減少 |

**推奨**: 税引前利益と税引後利益の両方を表示

---

### 4.2 キャンセル・空室リスクの未考慮

**現状**: CSVの稼働日数がそのまま達成されると仮定

**リスク**:
- 直前キャンセル
- 悪天候による予約減
- 競合の出現
- 季節的な需要変動（想定外）

**推奨**: 「信頼性係数」（0.85〜0.95）を導入

```typescript
const reliabilityFactor = facility.reliabilityFactor ?? 0.9;
const adjustedWorkingDays = workingDays * reliabilityFactor;
```

---

### 4.3 初期投資コストの欠如

**現状**: ランニングコストのみ計算、初期投資は考慮なし

**考慮すべき初期費用**:
- 家具・家電購入費
- リノベーション費用
- 許可申請費用
- 備品・消耗品の初期購入
- 写真撮影・リスティング作成費用

**推奨**: 初期投資セクションを追加し、投資回収期間を計算

---

## まとめ：優先度別対応リスト

### 今すぐ修正必要（P0）

| # | 問題 | 影響度 | 修正難易度 |
|---|------|--------|-----------|
| 1 | 稼働日数CSVファイル選択ロジックの逆転 | **致命的** | 簡単（1行修正） |
| 2 | cleaningCsvTextの未使用 | 高 | 中（数十行追加） |

### 早期修正推奨（P1）

| # | 問題 | 影響度 | 修正難易度 |
|---|------|--------|-----------|
| 3 | 清掃費の売上/経費連動 | 中 | 中 |
| 4 | 稼働率計算ロジック | 中 | 中 |
| 5 | ファイル命名規則の統一 | 低 | 簡単 |

### 将来対応（P2）

| # | 問題 | 影響度 | 修正難易度 |
|---|------|--------|-----------|
| 6 | ハードコード定数の設定化 | 低 | 中 |
| 7 | 水道光熱費の季節変動 | 低 | 中 |
| 8 | 税金計算の追加 | 中 | 高 |
| 9 | キャンセルリスク考慮 | 中 | 中 |

---

## 付録：問題箇所のコードマッピング

```
src/app/api/simulation-data/route.ts
├── 18-20行目: 稼働日数CSVファイル選択（★問題1）
└── 35行目: cleaningCsvText返却（★問題2関連）

src/app/pro/lib/simulate.ts
├── 21-26行目: ハードコード定数（問題6）
├── 279-286行目: API応答のdestructuring（★問題2）
├── 377行目: 水道光熱費計算（問題7）
├── 409-428行目: 清掃売上/経費計算（問題3）
├── 419-429行目: 成長率と経費計算（問題4関連）
└── 529-551行目: 稼働率計算（問題4）
```

---

*作成日: 2026-01-16*
*作成者: Claude Opus 4.5*
