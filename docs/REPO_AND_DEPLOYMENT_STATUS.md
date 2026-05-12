# リポジトリとデプロイメントの整合性ステータス

## 調査日 / 整理日
- 初回調査: 2026-05-11
- 整理実施: 2026-05-12

## 調査目的
ローカルで作業しているコードと、Vercel に公開されているURLの関係が不明瞭になっていたため、現状を整理する。

---

## 🎯 現在のステータス（2026-05-12 整理完了後）

**Pro版の最新コードが正しく専用URLで公開されている状態。**

| | 内容 |
|---|---|
| ⭐ 本番URL | **https://minpakusim-pro.vercel.app/pro** |
| 連携リポジトリ | `0ne9uy/minpakusim-pro` |
| 本番ブランチ | `main` |
| 最新コミット | `cc80f88`（2026-01-16） |
| Vercelプロジェクト | `minpakusim-pro`（チーム: `Minpaku's projects`） |
| ビルド状態 | Ready ✅ |

---

## 📜 整理前の状態（2026-05-11 時点）

**当時、公開されていたURLは別のリポジトリの古い内容を表示しており、最新の作業は未公開だった。**

| | 内容 |
|---|---|
| 旧公開URL | `https://minpaku-sim-git-pro-minpakus-projects.vercel.app/pro` |
| 旧URLが見ていたコード | `0ne9uy/minpaku-sim` リポジトリの `pro` ブランチ（最新 2025-10-15） |
| ローカルの作業 | `0ne9uy/minpakusim-pro` リポジトリの `fix` ブランチ（最新 2026-01-16） |
| 整合性 | ❌ 別リポジトリ。最新の作業は反映されていなかった |

---

## 関連するGitHubリポジトリ

GitHubアカウント `0ne9uy` 配下に民泊シミュレーション関連のリポジトリが3つ存在する。

| リポジトリ | 公開 | 最終更新 | 役割 |
|---|---|---|---|
| `0ne9uy/minpaku-sim` | private | 2026-01-12 | 旧・全部入りリポジトリ（simple + pro 同居の名残） |
| `0ne9uy/minpakusim-simple` | private | 2026-01-14 | simple版（分離済み） |
| `0ne9uy/minpakusim-pro` | public | 2026-01-16 | **pro版（分離済み）← ローカルはこれ** |

---

## 関連するVercelプロジェクト

Vercelチーム: **`Minpaku's projects`**（slug: `minpakus-projects`、Hobbyプラン）
所属アカウント: `minpakusimtest-1251`

| Vercelプロジェクト | 連携GitHubリポジトリ | 本番URL |
|---|---|---|
| `minpakusim-simple-launch` | `0ne9uy/minpakusim-simple` | `minpakusim-simple-launch.vercel.app` |
| `minpaku-sim` | `0ne9uy/minpaku-sim` | `minpaku-sim-sigma.vercel.app`（main）／`minpaku-sim-git-pro-minpakus-projects.vercel.app`（pro ブランチプレビュー） |
| ⚠️ **pro版用プロジェクトは未作成** | （なし） | （未公開） |

別Vercelチーム `tokiya hiruma's projects` にも `minpaku-sim*` という名前のプロジェクトが3つ存在するが、今回の調査対象外（過去の実験用と推測）。

---

## 推定される経緯

```
~2025年10月
  0ne9uy/minpaku-sim（simple版とpro版が同居）
    ├── main : simple版を開発
    └── pro  : pro版を開発（プレビューURL: minpaku-sim-git-pro-...vercel.app）
                └─ 最新コミット 2025-10-15 で開発が止まる

2026年1月12日頃
  simple版を別リポジトリ 0ne9uy/minpakusim-simple に分離
    → Vercel に minpakusim-simple-launch プロジェクトを新規連携

2026年1月15日
  pro版を別リポジトリ 0ne9uy/minpakusim-pro に分離（Initial commit）
    → ただし Vercel との連携は作成していない（ここが抜け落ちている）

2026年1月15〜16日
  ローカルで fix ブランチを作成しシミュレーションロジック修正等を実施
    → push 済みだが Vercel 未連携のため公開されていない

2026年5月11日
  公開URLがどこを指しているか不明になり、本調査を実施
```

---

## 不整合の詳細

### `minpaku-sim/pro` ブランチ（公開URLの内容）

- 最新コミット: `00742e3`（2025-10-15）
- 内容: 2025年10月時点のpro版コード
- 公開URL: `https://minpaku-sim-git-pro-minpakus-projects.vercel.app/pro`

### `minpakusim-pro/fix` ブランチ（ローカルの内容）

- 最新コミット: `cc80f88`（2026-01-16）
- 含まれる主な変更:
  - シミュレーションロジック修正
  - CSVファイル整理（`working-days.csv` → `working-days-shinpou.csv`、`monthly-index.csv` 削除）
  - データ管理機能の削除（Vercelのファイル書き込み制限に対応）
  - 仕様書の大幅更新
- 公開先: **なし**

### ツリーハッシュ比較
- `minpaku-sim/pro` 最新 → tree: `78202f3`
- `minpakusim-pro/main` 初期コミット → tree: `4c4ffd0`

→ 分離時に何らかの整理が入ったため完全コピーではない。新リポジトリ `minpakusim-pro` 側を「正」と扱うのが自然。

---

## 実施した整理作業（2026-05-12）

採用したアプローチ: **新規Vercelプロジェクトを作成**（simple版を分離したときと同じパターン）

### Phase 0: 事前準備
- ✅ ローカルで `npm run build` が成功することを確認
- ✅ `fix` → `main` の fast-forward マージ可能性を確認

### Phase 0-B: ブランチ整理
- ✅ `fix` を `main` に fast-forward マージ（`7723356..cc80f88`）
- ✅ `origin/main` に push

### Phase 1: 新規Vercelプロジェクト作成
- ✅ `Minpaku's projects` チームで新規プロジェクト `minpakusim-pro` を作成
- ✅ GitHub `0ne9uy/minpakusim-pro` を連携
- ✅ Framework は Next.js が自動検出
- ✅ **環境変数の設定はなし**（後述）

### Phase 2: 動作確認
- ✅ 本番URL `https://minpakusim-pro.vercel.app/pro` で正常表示
- ✅ ビルドステータス Ready
- ✅ シミュレーション結果まで動作

### Phase 3: 後片付け（すべて実施）
- ✅ **3-A**: 本ドキュメント更新
- ✅ **3-B**: ローカル/リモートの `fix` ブランチ削除
- ✅ **3-C**: 旧Vercelプロジェクトを `minpaku-sim` → **`minpaku-sim-archive`** にリネーム（コードは残し、表記で古いものと明示）
- ✅ **3-D**: 旧GitHubリポジトリ `0ne9uy/minpaku-sim` を **アーカイブ**（読み取り専用化、Private archive バッジ表示）

---

## 環境変数について（重要メモ）

**Pro版には `RESEND_API_KEY` などの環境変数は不要**。

- コード上 `/api/send-email/route.ts` は存在するが、`src/app/pro/` 配下のどこからも呼ばれていない孤立した API（simple版分離前の名残）
- pro 配下の API 呼び出しは `/api/simulation-data`（無認証・CSV取得）と `zipcloud`（外部・無認証）のみ
- 将来のクリーンアップ候補: `src/app/api/send-email/` 削除 + `package.json` から `resend` 依存削除

詳細は `docs/VERCEL_DEPLOYMENT_ANALYSIS.md` 参照。

---

## 整理後の最終状態（2026-05-12 完了時点）

### Vercel（Minpaku's projects チーム）

| プロジェクト | 連携リポジトリ | 役割 |
|---|---|---|
| ⭐ **`minpakusim-pro`** | `0ne9uy/minpakusim-pro` | **現役・pro版** |
| `minpakusim-simple-launch` | `0ne9uy/minpakusim-simple` | 現役・simple版 |
| 🗄️ `minpaku-sim-archive`（旧 `minpaku-sim`） | `0ne9uy/minpaku-sim`（アーカイブ済） | 凍結・履歴保持用 |

### GitHub（`0ne9uy`）

| リポジトリ | 状態 | 役割 |
|---|---|---|
| ⭐ `minpakusim-pro` | public | **現役・pro版** |
| `minpakusim-simple` | private | 現役・simple版 |
| 🗄️ `minpaku-sim` | **private archive**（読み取り専用） | 凍結・履歴保持用 |

### ローカル git ブランチ

| ブランチ | 状態 |
|---|---|
| `main` | 最新（Vercel本番ブランチ） |
| ~~`fix`~~ | 削除済み |

---

## 将来の任意タスク（やってもやらなくてもOK）

- `/api/send-email/` と `resend` 依存の削除（pro では未使用の死んだコード）
- `docs/Untitled` のような未追跡空ファイルが再発生したら削除

---

## 関連ドキュメント

- `docs/VERCEL_DEPLOYMENT_ANALYSIS.md` — Vercelでの動作可否の技術分析
- `docs/SIMULATION_SPECIFICATION.md` — シミュレーション仕様書
- `docs/LOGIC_CONTRADICTIONS.md` — ロジック矛盾の分析

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-05-11 | 調査・初版作成 |
| 2026-05-12 | 整理作業をすべて実施（新規Vercelプロジェクト作成、fixブランチ削除、旧Vercelプロジェクトのリネーム、旧GitHubリポのアーカイブ）。本ドキュメントを最新化 |

---

*最終更新: 2026-05-12*
