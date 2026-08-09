# 実装計画

[`architectures/02-no-framework-ssg.md`](./architectures/02-no-framework-ssg.md) の構成へ移行するための段取り。
要件は [`requirements.md`](./requirements.md)、移植元の詳細は [`current-implementation.md`](./current-implementation.md)。

## 進め方の原則

1. **縦に 1 本通してから横に広げる** — 記事 1 本が表示できる状態を最速で作り、難所（Markdown・画像）をそこで潰す
2. **各フェーズは機械的に検証できる完了条件を持つ**
3. **テストは同じフェーズで書く**（[02](./architectures/02-no-framework-ssg.md) §6）
4. **`out/` の構造を現行と一致させる** — `/articles/2.html` 形式。Cloudflare Pages 側は無変更

---

## 現在地

### 完了

- Astro 実装の削除、`.mdx` → `.md` 変換（20 件）
- `globals.css` の Tailwind 除去（レイヤー構成・`light-dark()`）
- **Phase 0** — `package.json` / `tsconfig.json` / `biome.json`、依存インストール、ディレクトリ骨組み
- コンテンツを **リポジトリルートの `content/`** へ移動（`src/` はコードのみ）
- 移植済み: `features/link-card/fetch-meta.ts`、`features/markdown/plugins/*`、`content/query.ts`、`content/paginate.ts`、`features/image/size.ts`、`config.ts`

### 未着手

`content/articles.ts`、`features/**` の大半、`pages/**`、`routes.ts`、`scripts/**` はファイルのみ作成済みで中身は空。
作品データは `src/data/db.json` のままで、`content/artworks/` は空。

### ディレクトリ構成

```
content/                    # データ（about / articles / artworks）
public/
scripts/                    # build.ts  dev.ts  gen-schema.ts  new-artwork.ts
src/
├── routes.ts               # パス列挙の単一定義元
├── config.ts               # 定数
├── content/                # コンテンツの読み込みとクエリ
│   ├── articles.ts  artworks.ts     # スキーマ・型・読み込み
│   ├── query.ts                     # filterByTag / sortByDate / collectTags
│   └── paginate.ts                  # paginate / pageIdGen / pageCount
├── features/                # ビルドのステージ
│   ├── markdown/  image/  og/  link-card/
├── components/  pages/  layouts/  styles/  assets/
```

**規則 2 つ:**

- ドメインでディレクトリを切り、各ドメイン内で **I/O を関数の内側に閉じる**（import 時に副作用を起こさない）
- **`src/features/**` は `components` / `layouts` / `pages` / `routes` を import しない** — テストで検査する

---

## Phase 1: コンテンツ層

UI なしで記事と作品を型付きで読み出せる状態にする。

1. **zod スキーマ** — 記事 / 作品。**タグを `z.enum` 化**し、命名の揺れ（`Adobe_Illustrator` / `OriginalCharacter` / `図画団`）を整理
2. **作品データの移行**（使い捨てスクリプト）— `src/data/db.json` の 23 件 → `content/artworks/<id>/meta.json`。画像を各ディレクトリへ移動
   - `src` の Vite glob キー（`/public/images/artworks/...`）を相対パスへ
   - 配列順（`toReversed()`）から `date` を起こす。元の並び順を保持できる値を割り当てる
3. **`_schema.json` の生成**（`scripts/gen-schema.ts`）
4. **ローダ** — `content/articles.ts` / `artworks.ts`。走査 → パース → **zod 検証**。ID はパス・ディレクトリ名から導出

### テスト

全記事・全作品がスキーマを通ること / `_schema.json` が zod と一致すること / ページネーションの境界 / タグ集計 / 下書きが本番で除外されること

### 完了条件

`bun test` が通り、`src/data/db.json` と `public/images/artworks/` を削除できている

> **タグ名の変更は URL の変更**（`/artworks/tag/<tag>`）。整理する場合はリダイレクトの要否を判断する。`content/dictionary.json`（タグ → 日本語ハッシュタグ）も同時に更新する。

---

## Phase 2: Markdown パイプライン

最も壊れやすい部分をここで確定させる。

1. **unified 移植** — remark: frontmatter / gemoji / denden-ruby / math / link-card、`remarkRehype`（`allowDangerousHtml`, `footnoteLabel: "脚注"`）、rehype: slug / autolink-headings / katex / unwrap-images
2. **目次収集**（`headings.ts`）— depth ≤ 3
3. **expressive-code**（`highlight.ts`）— テーマ・プラグイン・`defaultProps` を移植。**CSS を手動注入**（自動注入がない）。**Caddyfile 文法をディスクキャッシュ**
4. **hast → React**（`render.tsx`）— `toReact(tree, components)` として**汎用に保つ**。差し替え表は `components/MarkdownComponent.tsx` が供給する
5. KaTeX CSS を `globals.css` から `@import`

### テスト

記法ごとのスナップショット（絵文字 / ルビ / 数式 / 脚注 / 生 HTML / 見出しアンカー / コードブロック / Caddyfile / リンクカード判定 / 目次 0 件）

### 完了条件

実際の記事 20 本が例外なく変換でき、**ネットワークを切断してもビルドが通る**

---

## Phase 3: 縦の 1 本

記事 1 本がブラウザで正しく読める状態にする。**最初の大きなマイルストーン。**

1. **`src/routes.ts`** — `{ path, indexable, render }` の配列。この時点では記事詳細のみ
   - ページ群を作る `paginatedRoutes` ヘルパーをここに置く（一覧・タグで 4 回使う）
2. **`scripts/build.ts`** — ルートテーブルを走査して `out/` へ書き出し
3. **`scripts/dev.ts`** — **同じ `routes.ts` を使うオンデマンド生成**（§7.3）。ライブリロードは Phase 7
4. **コンポーネント第 1 弾** — `Layout` / `Header` / `Footer` / `Top` / `Back` / `ArticleToc`
   - `.astro` → React JSX（`class` → `className`、`<slot />` の書き換え）
   - **Tailwind ユーティリティをセマンティックなクラス名へ**
5. `globals.css` と `public/` を `out/` へコピー

### 完了条件

`out/articles/<slug>.html` を開いて、目次・コードハイライト・数式・ルビ・脚注が正しく表示される（画像とリンクカードは未対応でよい）

---

## Phase 4: 画像パイプライン

最大の工数を単独で片付ける。

1. **ステージ境界**（§7.12）— 入力ファイル一覧 → 変換済み画像 + **寸法マニフェスト JSON**
2. **変換** — AVIF quality 70、幅 700px 基準・高さ 540px 上限。`Promise.all` + 同時実行数制限（実測 410ms → 97ms/枚）
3. **永続キャッシュ** — キー = `hash(入力バイト + 変換パラメータ + パイプラインのバージョン)`。**バージョンを含めること**
4. **dev では AVIF を生成しない** — 原寸配信 + `width` / `height` は出す
5. **コンポーネント** — `Image` / `ImageHandler`。本文画像はキャプションあり、作品画像はなし

### 完了条件

AVIF が出力され `aspect-ratio` が付く / **2 回目のビルドで画像処理が丸ごとスキップされる** / dev で変換が走らない

---

## Phase 5: 残りのページ

- **コンポーネント第 2 弾** — `ArticlesList` / `PageBar` / `Gallery` / `GalleryRow` / `TopArticle` / `SNSList` / `shareButton`
- 記事一覧・記事タグ別・作品一覧・作品詳細・作品タグ別・About・404 を `routes.ts` に追加
- `scripts/new-artwork.ts`（[03](./architectures/03-cms.md) §1）

### 完了条件

85 ページ生成 / `out/404.html` が存在 / 下書きが本番ビルドに含まれない

---

## Phase 6: 周辺機能

1. **リンクカード** — `fetch-meta.ts` から純粋部分を `parse.ts` へ分離。**`fetch` を引数で注入可能に**。`.cache/link-meta.json` へ永続化。dev はネットワークを叩かない
2. **OGP 画像** — satori + budoux。**現行が既に React JSX なので JSX の書き換えは不要**。キャッシュは Phase 4 と同方式
3. **サイトマップ** — `routes().filter(r => r.indexable)` から生成。収録ルールを [`requirements.md`](./requirements.md) §9 に沿って書き直す

### テスト

`fetch-meta` の分岐（2 段階 UA / リトライ / サブドメインフォールバック / 全失敗）— fetch 注入により実ネットワーク不要
サイトマップにページネーション 2 ページ目以降とタグ別が含まれないこと / 全記事・全作品に OGP がある

---

## Phase 7: 開発サーバの仕上げ

ライブリロード（SSE）/ CSS は `<link>` の `href` 差し替え / `bun --hot` 対応（`globalThis` にハイライタを退避）/ エラーを HTML で返す

### 完了条件

起動が即時 / Markdown 編集が数百 ms で反映 / CSS がリロードなしで反映

---

## Phase 8: CI / CD

- `ci.yml` — `bunx astro sync` を削除、Astro キャッシュを `.cache/` に差し替え、**`bun test` を追加**
- `deploy.yml` は**変更不要**

---

## Phase 9: 検証と切り替え

1. **本番同等ビルド**（dev の簡略化を無効化）
2. **現行サイトとの差分比較** — `https://omemoji.com/` から全ページを取得し、**テキスト内容**を照合するスクリプトを書く（クラス名は変わるので完全一致は目指さない）
3. **リンク切れ検査** — `out/` 内の内部リンクの参照先がすべて存在すること
4. `README.md` の「使用している技術」を更新
5. `main` へマージ

---

## リスク

| リスク                                 | 対処                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 画像パイプラインが重い                 | 独立フェーズにしてある。ステージ境界を切ってあるので最悪 sharp を CLI（`vips` / `avifenc`）に差し替えられる |
| expressive-code の CSS 注入が動かない  | **Phase 2 で早期に潰す**。最悪 Shiki 直接利用へ後退（枠線・折りたたみを失う）                               |
| ルビ・KaTeX の出力が変わる             | Phase 2 のスナップショットと Phase 9 の差分比較で検出                                                       |
| 作品の `date` 割り当てで並び順が変わる | Phase 1 でテストにより順序を固定                                                                            |
| タグ enum 化で URL が変わる            | 上記 Phase 1 の注記を参照                                                                                   |

## 未決事項

- **サイトマップの収録ルール** — 現行の除外条件が詳細ページまで巻き込んでいる疑い（[`current-implementation.md`](./current-implementation.md) §10）
- **RSS** — 未実装。移植と同時に実装するかは別途判断
- **`.cache/` を Git 管理するか** — リンクカードのメタデータのみ、参照先サイトの消滅に備えてコミットする選択肢がある
