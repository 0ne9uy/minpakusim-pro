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

### 1.1 稼働日数CSVファイルの選択ロジック ✅ 修正済み

**発見場所**: `/src/app/api/simulation-data/route.ts` 18-20行目

**状態**: ✅ **修正完了**（2026-01-16）

**現在のコード（正常）**:

```typescript
// 民泊新法適用時はworking-days-shinpou.csv（少ない稼働日数）を使用
// 民泊新法非適用時はworking-days-normal.csv（多い稼働日数）を使用
const workingDaysFileName = isLaw ? "working-days-shinpou.csv" : "working-days-normal.csv";
```

**CSVファイルの内容**:

| ファイル | 北海道・8月の稼働日数 | 年間合計（概算） | 使用条件 |
|----------|---------------------|-----------------|---------|
| working-days-shinpou.csv | 15日 | 約130日 | 民泊新法適用時（isLaw=true） |
| working-days-normal.csv | 25日 | 約213日 | 民泊新法非適用時（isLaw=false） |

**ロジックの正当性**:

- `isLaw = true`（民泊新法適用 = 180日制限あり）→ **少ない方**のファイル ✅
- `isLaw = false`（民泊新法非適用 = 制限なし）→ **多い方**のファイル ✅

---

### 1.2 清掃単価CSVがsimulate.tsで受け取られていない ✅ 修正済み

**発見場所**:
- API: `/src/app/api/simulation-data/route.ts` 24行目、35行目
- シミュレーション: `/src/app/pro/lib/simulate.ts` 330-340行目

**状態**: ✅ **修正完了**（2026-01-16）

**修正内容**:

1. `simulate.ts`で`cleaningCsvText`を受け取るように修正
2. `CleaningPriceRow`型を定義
3. `getRoomRankFromArea()`関数を追加（面積からランクA/B/C/Dを取得）
4. `getCleaningPriceFromTable()`関数を追加（ランク×ベッド数から規定値を取得）
5. 清掃単価の計算でユーザー入力がない場合はテーブルから規定値を使用

```typescript
// 清掃単価: ユーザー入力があればそれを使用、なければCSVテーブルから規定値を取得
const roomArea = N(room.roomArea, 0);
const roomRank = getRoomRankFromArea(rankRows, roomArea);
const cleaningFromTable = getCleaningPriceFromTable(cleaningRows, roomRank, capacity, beds);
const cleaningUnit =
  room.cleaningUnitPrice != null ? N(room.cleaningUnitPrice, cleaningFromTable) : cleaningFromTable;
```

**動作**:
- ユーザーが清掃単価を入力した場合 → その値を使用
- ユーザーが清掃単価を入力しない場合 → `cleaning-price.csv`から面積ランク×ベッド数に基づく規定値を使用
- 規定値が見つからない場合 → デフォルト3000円

#### ✅ 実装完了：規定値表示＋手動入力可能

**実装済み内容**（2026-01-16）：

1. ✅ `simulate.ts`で`cleaningCsvText`を受け取る
2. ✅ `CleaningPriceRow`型を定義
3. ✅ `getRoomRankFromArea()`関数を実装（面積からランクA/B/C/Dを取得）
4. ✅ `getCleaningPriceFromTable()`関数を実装（ランク×ベッド数から規定値を取得）
5. ✅ CSVデータ欠損時のフォールバック（最も近い組み合わせを探索、デフォルト3000円）

**実装済みのロジック**：
```typescript
// 清掃単価: ユーザー入力があればそれを使用、なければCSVテーブルから規定値を取得
const roomArea = N(room.roomArea, 0);
const roomRank = getRoomRankFromArea(rankRows, roomArea);
const cleaningFromTable = getCleaningPriceFromTable(cleaningRows, roomRank, capacity, beds);
const cleaningUnit =
  room.cleaningUnitPrice != null ? N(room.cleaningUnitPrice, cleaningFromTable) : cleaningFromTable;
```

**今後の改善候補**（任意）：
- フォームの必須バリデーションを任意に変更
- フォーム初期値として規定値を表示（面積・ベッド数から計算）
- リアルタイム更新機能（面積・ベッド数変更時に規定値を再計算）
- UI改善（「規定値: ¥X,XXX（変更可能）」と表示）

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

### 2.2 稼働率の計算ロジック（実装は正しい）

**発見場所**: `/src/app/pro/lib/simulate.ts` 529-551行目

**実装内容**:

民泊新法非適用時の稼働率計算が「カレンダー日数」を分母にしています。

```typescript
// 民泊新法非適用時
const maxPossibleDays = facility.isLaw ? annualLimitDays : totalCalendarDays;
const occupancyRate = (totalEffectiveWorkingDays / maxPossibleDays) * 100;
```

**具体例**（12ヶ月シミュレーション、民泊新法非適用）:

| 項目 | 値 | 説明 |
|------|-----|------|
| CSVからの稼働日数合計 | 213日 | 予測稼働日数（実際に予約が入ると見込まれる日数） |
| カレンダー日数 | 365日 | 稼働可能日数（民泊新法非適用時は理論上365日すべて稼働可能） |
| 計算される稼働率 | 213 ÷ 365 = **58.4%** | **予約が入る可能性がある日のうち、何%が稼働するか** |

**実装の妥当性**:

✅ **実装は正しく、ユーザーの期待に合致しています**

- 民泊新法非適用時: 稼働可能日数 = 365日（カレンダー日数）
- CSVの値（213日）= 予測稼働日数
- 稼働率 = 213 ÷ 365 = 58.4% = 「予約が入る可能性がある日（365日）のうち、何%が稼働するか（213日）」

**民泊新法適用時との比較**:

| 項目 | 民泊新法適用時 | 民泊新法非適用時 |
|------|--------------|----------------|
| 稼働可能日数 | 180日（法律上の上限） | 365日（カレンダー日数） |
| 計算式 | 予測稼働日数 ÷ 180 × 100 | 予測稼働日数 ÷ 365 × 100 |
| 意味 | 「法律上の上限の何%を使うか」 | 「予約が入る可能性がある日のうち、何%が稼働するか」 |
| 一貫性 | ✅ 両方とも「稼働可能日数に対する稼働率」という同じ概念 | |

**改善提案（任意）**:

実装は正しいですが、UIでの説明を追加することで、より分かりやすくなります：

```typescript
// 現在の実装を維持
const occupancyRate = (totalEffectiveWorkingDays / maxPossibleDays) * 100;

// UI表示例
if (facility.isLaw) {
  // "稼働率: 72.2%（年間180日のうち130日稼働予定）"
} else {
  // "稼働率: 58.4%（年間365日のうち213日稼働予定）"
}
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

| # | 問題 | 影響度 | 修正難易度 | 状態 |
|---|------|--------|-----------|------|
| 1 | ~~稼働日数CSVファイル選択ロジックの逆転~~ | ~~致命的~~ | ~~簡単~~ | ✅ 修正済み |
| 2 | ~~cleaningCsvTextがsimulate.tsで未受信~~ | ~~高~~ | ~~中~~ | ✅ 修正済み |

### 早期修正推奨（P1）

| # | 問題 | 影響度 | 修正難易度 | 状態 |
|---|------|--------|-----------|------|
| 3 | 清掃費の売上/経費連動 | 中 | 中 | 仕様確認要 |
| 4 | ~~稼働率計算ロジック~~ | - | - | ✅ 実装は正しい |
| 5 | ファイル命名規則の統一 | 低 | 簡単 | 🔲 未着手 |

### 将来対応（P2）

| # | 問題 | 影響度 | 修正難易度 | 状態 |
|---|------|--------|-----------|------|
| 6 | ハードコード定数の設定化 | 低 | 中 | 🔲 未着手 |
| 7 | 水道光熱費の季節変動 | 低 | 中 | 🔲 未着手 |
| 8 | 税金計算の追加 | 中 | 高 | 🔲 未着手 |
| 9 | キャンセルリスク考慮 | 中 | 中 | 🔲 未着手 |

---

## 付録：問題箇所のコードマッピング

```
src/app/api/simulation-data/route.ts
├── 18-20行目: 稼働日数CSVファイル選択（✅ 修正済み）
└── 31-38行目: cleaningCsvText返却（✅ 正常に返却中）

src/app/pro/lib/simulate.ts
├── 21-26行目: ハードコード定数（問題6）
├── 123-131行目: CleaningPriceRow型定義（✅ 新規追加）
├── 140-147行目: getRoomRankFromArea()関数（✅ 新規追加）
├── 149-183行目: getCleaningPriceFromTable()関数（✅ 新規追加）
├── 330-340行目: API応答のdestructuring（✅ 修正済み - cleaningCsvText受信）
├── 350行目: cleaningRows パース（✅ 新規追加）
├── 437-441行目: 清掃単価の規定値取得ロジック（✅ 新規追加）
├── 467-478行目: 清掃売上/経費計算（問題3 - 仕様確認中）
├── 479-489行目: 成長率と経費計算（仕様確認中）
└── 590-610行目: 稼働率計算（✅ 正しく実装）
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-01-16 | v1.3: cleaningCsvText問題を修正完了（simulate.tsで受信、規定値フォールバック実装） |
| 2026-01-16 | v1.2: CSVファイル選択ロジック修正済みに更新、稼働率計算は正しいことを確認、問題箇所マッピング更新 |
| 2026-01-16 | v1.1: 稼働率計算ロジックの評価を「実装は正しい」に更新 |
| 2026-01-16 | v1.0: 初版作成 |

---

*最終更新: 2026-01-16*
*作成者: Claude Opus 4.5*
