# 実装計画

[`architectures/02-no-framework-ssg.md`](./architectures/02-no-framework-ssg.md) で決めた構成へ移行するための段取り。

要件は [`requirements.md`](./requirements.md)、現行 Astro 実装の詳細は [`current-implementation.md`](./current-implementation.md) を参照。

## 現在地

### 完了しているもの

| 項目                             | 状態                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Astro 実装の削除                 | `src/pages` / `src/components` / `src/layouts` / `astro.config.ts` を削除済み                                                   |
| コンテンツの `.mdx` → `.md` 変換 | 20 ファイル完了。MDX 固有構文の残存なし                                                                                         |
| `globals.css` の Tailwind 除去   | 素の CSS へ移行済み（レイヤー構成・`light-dark()` 適用済み）                                                                    |
| `biome.json`                     | 復活済み（`.astro` 向け override の削除は未実施）                                                                               |
| フレームワーク非依存のロジック   | `src/lib/` に温存（`fetchMeta.ts` / `remark-link-card.ts` / `mdast-util-node-is.ts` / `constant.ts` / `fs.ts` / `artworks.ts`） |
| コンテンツ本体                   | 記事 20 件・画像 104 枚・`src/assets/`・`public/`                                                                               |

### 未着手のもの

- `package.json`（空）、`tsconfig.json`（`{}`）
- 作品データは `src/data/db.json` のまま（1 件 1 ディレクトリへの移行が必要）
- テンプレート・ルーティング・ビルドスクリプト・テストの一切
- `src/lib/artworks.ts` に `import type { ImageMetadata } from "astro"` が残存

---

## 進め方の原則

1. **縦に 1 本通してから横に広げる。** 記事 1 本が完全に表示できる状態を最速で作り、そこで難所（Markdown パイプライン・画像）を潰す。ページ種別を増やすのはその後
2. **各フェーズは機械的に検証できる完了条件を持つ。** 「動いた気がする」で次へ進まない
3. **テストは後付けしない。** 各フェーズの成果物に対応するテストを同じフェーズで書く（[02](./architectures/02-no-framework-ssg.md) §6）
4. **`out/` の構造は現行と一致させる。** `build.format: "file"` 相当（`/articles/2.html`）を維持し、Cloudflare Pages 側の設定を変えない

---

## Phase 0: 足場

**目的**: 依存とツールチェーンを立ち上げ、空の状態で CI が回ることを確認する。

### 作業

- `package.json` の scripts / dependencies を定義
- `tsconfig.json` を作成
  - `strict` + `noUncheckedIndexedAccess`
  - `jsx: "react-jsx"` / `jsxImportSource: "react"`
  - パスエイリアス `@/*` → `./src/*`
- `biome.json` から `.astro` 向け override を削除
- ディレクトリの骨組みを作る（後述の構成）
- `src/lib/artworks.ts` から Astro 由来の型を除去

### 依存パッケージ

```
react, react-dom, @types/react, @types/react-dom
unified, remark-parse, remark-rehype, remark-frontmatter,
remark-gemoji, remark-denden-ruby, remark-math,
rehype-slug, rehype-autolink-headings, rehype-katex,
rehype-unwrap-images, rehype-expressive-code,
@expressive-code/plugin-line-numbers, @expressive-code/plugin-collapsible-sections,
hast-util-to-jsx-runtime, unist-util-visit,
zod, zod-to-json-schema, yaml,
sharp, satori, budoux, cheerio, katex
```

> **[02](./architectures/02-no-framework-ssg.md) §8 の依存一覧に漏れがある。** front matter の解析に YAML パーサが必要（`remark-frontmatter` + `yaml`、または `gray-matter`）。Astro が隠していた部分なので見落としやすい。§8 に追記すること。

### ディレクトリ構成

```
scripts/
├── build.ts               # 全パスを列挙して out/ に書き出す
├── dev.ts                 # オンデマンド生成 + ライブリロード
├── new-artwork.ts         # 作品追加 CLI（Phase 5 以降）
└── gen-schema.ts          # zod → _schema.json
src/
├── routes.ts              # ★ ルートテーブル。build と dev が共有する
├── content/               # 記事・作品（データ）
├── data/                  # dictionary.json（タグ → 日本語ハッシュタグの対応表）
├── lib/
│   ├── content/           # ローダ・スキーマ・ページネーション・タグ集計
│   ├── markdown/          # unified パイプライン・目次収集・components マップ
│   ├── image/             # sharp パイプライン + マニフェスト
│   ├── og/                # satori
│   ├── link-card/         # fetchMeta
│   ├── cache/             # ステージ境界の永続キャッシュ
│   └── constant.ts
├── components/            # React コンポーネント
├── layouts/
├── styles/globals.css
└── assets/
```

### 完了条件

- `bun install` が通る
- `bun run typecheck`（`tsc --noEmit`）が通る
- `bun run check:ci`（Biome）が通る
- `bun test` が 0 件で正常終了する

---

## Phase 1: コンテンツ層

**目的**: UI なしで、記事と作品を型付きで読み出せる状態にする。

### 作業

1. **zod スキーマ**（`lib/content/schema.ts`）
   - 記事: `emoji` / `title` / `description` / `date` / `tags` / `published`
   - 作品: `title` / `date` / `tags` / `image` / `href?` / `description?`
   - **タグを `z.enum` にする。** 現状の命名の揺れ（`Adobe_Illustrator` / `OriginalCharacter` / `New_Year` / `図画団`）をここで整理する
2. **作品データの移行**（使い捨てスクリプト）
   - `src/data/db.json` の 23 件 → `src/content/artworks/<id>/meta.json`
   - `public/images/artworks/*` から画像を各ディレクトリへ移動
   - `src` の `/public/images/artworks/...` という Vite glob キーを `image.png` 等の相対パスへ変換
   - 配列順（`toReversed()`）から `date` を起こす。**元の並び順を保持できる日付を割り当てる**
3. **`_schema.json` の生成**（`scripts/gen-schema.ts`）
4. **ローダ**（`lib/content/articles.ts` / `artworks.ts`）
   - ディレクトリ走査 → front matter / JSON 解析 → zod 検証
   - ID はファイルパス・ディレクトリ名から導出
   - 下書き除外は `published` と実行モードで判定
5. **ページネーションとタグ集計**（`lib/content/pagination.ts`）
   - 記事 7 件 / 作品 9 件、全ページ番号の列挙

### テスト

- 全記事・全作品がスキーマを通ること
- `_schema.json` が現在の zod 定義と一致すること（再生成し忘れの検出）
- ページネーションの境界（0 件・1 ページちょうど・端数）
- タグ集計と絞り込み
- 下書きが本番モードで除外されること

### 完了条件

- `bun test` で上記が通る
- `src/data/db.json` と `public/images/artworks/` が削除できている

---

## Phase 2: Markdown パイプライン

**目的**: Markdown 1 本を HTML 断片に変換できる状態にする。**最も壊れやすい部分をここで確定させる。**

### 作業

1. **unified パイプラインの移植**（`lib/markdown/pipeline.ts`）
   - remark: frontmatter / gemoji / denden-ruby / math / 自作 link-card
   - `remarkRehype`: `allowDangerousHtml: true`, `footnoteLabel: "脚注"`
   - rehype: slug / autolink-headings（`behavior: "wrap"`）/ katex / unwrap-images
2. **目次収集**（`lib/markdown/rehype-collect-headings.ts`）
   - depth ≤ 3、`{ depth, slug, text }` を副作用で回収
3. **expressive-code**
   - `rehype-expressive-code` を組み込む
   - テーマ・プラグイン・`defaultProps`・`styleOverrides` を移植
   - **CSS を手動注入する。** `getStyles()` / `getBaseStyles()` の出力を Layout に流す
   - **Caddyfile 文法をディスクキャッシュする。** 現状はビルドがネットワークに依存している
4. **hast → React**（`lib/markdown/render.tsx`）
   - `hast-util-to-jsx-runtime` に React の jsx runtime と components マップを渡す
   - この時点では `img` / `a` は素の要素のままでよい（差し替えは Phase 4 / 6）
5. KaTeX の CSS を `globals.css` から `@import` する

### テスト

記法ごとに最小入力 → HTML のスナップショットを固定する。

- 絵文字ショートコード / ルビ / 数式 / 脚注 / 生の HTML
- 見出しのアンカーとリンク化
- コードブロック（行番号・折りたたみ・Caddyfile）
- リンクカード判定（裸の外部リンクのみ / それ以外は通常リンク）
- 目次の抽出（depth 3 まで、見出し 0 件のケース）

### 完了条件

- 上記スナップショットが通る
- 実際の記事 20 本すべてが例外なく変換できる
- ネットワークを切断してもビルドが通る（Caddyfile 文法のキャッシュ確認）

---

## Phase 3: 縦の 1 本（記事詳細が表示される）

**目的**: 記事 1 本がブラウザで正しく読める状態にする。**ここが最初の大きなマイルストーン。**

### 作業

1. **`src/routes.ts`** — 全生成パスを組み立てる単一の定義元
   - `{ path, render, indexable }` の配列を返す
   - この時点では記事詳細のみ
2. **`scripts/build.ts`** — ルートテーブルを走査して `out/` に書き出す
   - `/articles/foo` → `out/articles/foo.html`（`format: "file"` 相当）
3. **`scripts/dev.ts`** — **同じ `routes.ts` を使うオンデマンド生成サーバ**
   - リクエストされたパスだけを描画する（[02](./architectures/02-no-framework-ssg.md) §7.3）
   - ライブリロードと `--hot` の作り込みは Phase 7
4. **コンポーネント移植（第 1 弾）** — `Layout` / `Header` / `Footer` / `Top` / `Back` / `ArticleToc`
   - `.astro` → React JSX。`class:list` と `<slot />` の書き換えが主（`class` → `className` も必要）
   - `ArticleToc` のインライン `<script>` はそのまま流用
   - **Tailwind ユーティリティをセマンティックなクラス名へ置き換える**（`globals.css` の `components` レイヤーか CSS Modules に対応する規則を書く）
5. `globals.css` と `public/` を `out/` へコピー

### 完了条件

- `bun run build` で `out/articles/<slug>.html` が生成される
- ブラウザで開いて、**目次・コードハイライト・数式・ルビ・脚注が正しく表示される**（画像とリンクカードは未対応でよい）
- `bun run dev` でオンデマンドに同じページが表示される

---

## Phase 4: 画像パイプライン

**目的**: 最大の工数を単独で片付ける。

### 作業

1. **ステージ境界の定義**（[02](./architectures/02-no-framework-ssg.md) §7.12）
   - 入力: 画像ファイル一覧 → 出力: 変換済み画像 + **寸法マニフェスト JSON**
   - 呼び出し側はマニフェストだけを見る
2. **変換処理**（`lib/image/`）
   - AVIF quality 70、幅 700px 基準・高さ 540px 上限
   - `Promise.all` + 同時実行数制限（実測 410ms → 97ms/枚）
3. **永続キャッシュ**（`lib/cache/`）
   - キー = `hash(入力バイト + 変換パラメータ + パイプラインのバージョン)`
   - **パイプラインのバージョンをキーに含めること**（品質設定変更時の再生成漏れ防止）
4. **dev では AVIF を生成しない** — 原寸を配信し `<picture>` を `<img>` に落とす。`width` / `height` は出す（CLS 対策）
5. **コンポーネント** — `Image` / `ImageHandler` を移植し、Markdown の `img` を差し替える
   - 本文画像はキャプションあり、作品画像はキャプションなし

### テスト

- サイズ計算（700px 基準・540px 上限・アスペクト比保持）
- キャッシュキーがパラメータ変更で変わること
- マニフェストの整合（全入力画像に出力が存在する）

### 完了条件

- 記事の画像が AVIF で出力され、`aspect-ratio` が付いている
- **2 回目以降のビルドで画像処理が丸ごとスキップされる**
- dev で画像変換が走らない

---

## Phase 5: 残りのページ

**目的**: 85 ページすべてを生成する。

### 作業

- **コンポーネント移植（第 2 弾）** — `ArticlesList` / `PageBar` / `Gallery` / `GalleryRow` / `TopArticle` / `SNSList` / `shareButton`
  - `shareButton` は `src/data/dictionary.json`（タグ → 日本語ハッシュタグの対応表）を参照する。**タグ enum を整理する場合はこの対応表も同時に更新すること**
- **ページ追加** — 記事一覧・記事タグ別・作品一覧・作品詳細・作品タグ別・About・404
- `routes.ts` を全パターンに拡張
- `scripts/new-artwork.ts`（作品追加 CLI。[03](./architectures/03-cms.md) §1）

### 完了条件

- 期待するページ数が生成される（記事 15 + 作品 23 + 一覧・タグ・About・404）
- `out/404.html` が存在する
- 下書きが本番ビルドに含まれない

---

## Phase 6: 周辺機能

### 作業

1. **リンクカード**
   - `fetchMeta.ts` を移植し、**`fetch` を引数で注入できる形に変更する**
   - `.cache/link-meta.json` へ永続化（現状はプロセス内 `Map` のみで毎回全件再取得）
   - dev ではネットワークを叩かず、未取得はプレースホルダ
   - `LinkCard` / `LinkHandler` コンポーネント
2. **OGP 画像**
   - satori + budoux を移植。**現行が既に React JSX なので JSX の書き換えは不要**
   - 記事用・作品用の 2 種類、1200×630
   - ステージ境界とキャッシュは Phase 4 と同じ方式
3. **サイトマップ**
   - `routes.ts` の `indexable` フラグから生成する
   - **収録ルールを [`requirements.md`](./requirements.md) §9 に沿って書き直す**（現行の正規表現は詳細ページまで除外している疑いがある）

### テスト

- `fetchMeta`: 2 段階 UA・リトライ・サブドメインフォールバック・全失敗時の分岐（fetch 注入により実ネットワーク不要）
- サイトマップに一覧のページネーションとタグ別一覧が含まれないこと
- 全記事・全作品に OGP 画像が存在すること

### 完了条件

- リンクカードが表示される
- OGP 画像が全件生成される
- `sitemap.xml` の内容が意図どおり

---

## Phase 7: 開発サーバの仕上げ

**目的**: [02](./architectures/02-no-framework-ssg.md) §7.10 の体感に到達する。

### 作業

- ライブリロード（SSE + dev のみ注入する `<script>`）
- CSS はリロードせず `<link>` の `href` を差し替える
- `bun --hot` 対応（`globalThis` にハイライタ等のインスタンスを退避）
- エラー時にスタックトレースを HTML で返す

### 完了条件

| 操作                 | 目標               |
| -------------------- | ------------------ |
| 起動                 | 即時               |
| Markdown 編集 → 反映 | 数百 ms            |
| CSS 編集 → 反映      | リロードなしで即時 |

---

## Phase 8: CI / CD

### 作業

- `ci.yml`
  - `bunx astro sync` を削除
  - Astro アセットキャッシュ（`node_modules/.astro`）を `.cache/` のキャッシュへ差し替え
  - **`bun test` を追加**
  - キャッシュキーから `astro.config.ts` を外す
- `deploy.yml` は**変更不要**（`out/` を Cloudflare Pages へ上げる部分は同じ）
- `dependabot.yml` の対象確認

### 完了条件

- PR で CI が通る
- Dependabot PR でプレビューデプロイが出る

---

## Phase 9: 移行の検証と切り替え

**目的**: 現行サイトとの等価性を確認してから `main` に入れる。

### 作業

1. **本番同等ビルド**を通す（dev の簡略化を無効にする）
2. **現行サイトとの差分比較**
   - `https://omemoji.com/` から全ページを取得し、新旧の**テキスト内容**を比較する
   - 完全一致は目指さない（クラス名は変わる）。**見出し構成・本文テキスト・リンク先・画像枚数**が一致することを確認する
   - 記事 15 本 + 作品 23 件を機械的に照合するスクリプトを書く
3. **リンク切れ検査** — `out/` 内の内部リンクの参照先がすべて存在すること
4. `README.md` の「使用している技術」を更新
5. `main` へマージ

### 完了条件

- 全記事・全作品でテキスト内容が一致
- 内部リンク切れゼロ
- Lighthouse などで表示崩れがないことを目視確認

---

## リスクと対処

| リスク                                          | 影響             | 対処                                                                                                                          |
| ----------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 画像パイプラインが想定より重い                  | Phase 4 の遅延   | 最大の工数として独立フェーズにしてある。ステージ境界を切ってあるので、最悪 sharp を CLI（`vips` / `avifenc`）に差し替えられる |
| expressive-code の CSS 注入が想定どおり動かない | Phase 2 が止まる | Astro integration と違い自動注入がない。**Phase 2 で早期に潰す**。最悪 Shiki 直接利用へ後退（枠線・折りたたみを失う）         |
| ルビ・KaTeX の出力が現行と変わる                | 表示崩れ         | Phase 2 のスナップショットテストと Phase 9 の差分比較で検出する                                                               |
| 作品の `date` 割り当てで並び順が変わる          | 表示順の変化     | Phase 1 で元の配列順を保持できる日付を割り当て、テストで順序を固定する                                                        |
| タグ enum 化で既存タグ名が変わる                | **URL が変わる** | `/artworks/tag/<tag>` の URL に影響する。命名を整理する場合はリダイレクトの要否を判断する                                     |

> 最後の 1 件は見落としやすい。タグ名は URL の一部であり、変更すると既存のリンクが切れる。命名の揺れを直すかどうかは、SEO 上の影響と引き換えになる。

---

## 未決事項

- **RSS** — 未実装のまま。移植と同時に実装するかは別途判断（[`requirements.md`](./requirements.md) §11）
- **`.cache/` を Git 管理するか** — CI キャッシュに載せる前提なら不要だが、リンクカードのメタデータは参照先サイトの消滅に備えてコミットする選択肢がある
- **タグ名の変更可否** — 上記リスク表を参照
