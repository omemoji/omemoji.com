# 現行実装の技術構成（Astro）

[`requirements.md`](./requirements.md) に挙げた機能を、`main` ブランチの Astro 実装がどう実現しているかを記録したもの。
移植時の参照元であり、**移植後の設計ではない**。

## 1. スタック

| 領域 | 採用技術 |
| --- | --- |
| フレームワーク | Astro 7（静的出力） |
| UI | Astro コンポーネント + React（OGP 画像生成のみ） |
| スタイル | Tailwind CSS v4（`@tailwindcss/vite`） |
| 言語 | TypeScript（`astro/tsconfigs/strict`、エイリアス `@/*` → `./src/*`） |
| Lint / Format | Biome |
| パッケージマネージャ | Bun |
| ホスティング | Cloudflare Pages |

## 2. ビルド設定（`astro.config.ts`）

```
site:          "https://omemoji.com/"
outDir:        "./out"
build.format:  "file"        → /articles/2.html
trailingSlash: "never"
image.remotePatterns: [{ protocol: "https" }]
```

## 3. ルーティング

ファイルベースルーティング + `getStaticPaths`。

| ファイル | 生成されるパス |
| --- | --- |
| `src/pages/index.astro` | `/` |
| `src/pages/articles/[...page].astro` | `/articles`, `/articles/2` … |
| `src/pages/articles/[slug].astro` | `/articles/<slug>` |
| `src/pages/articles/tag/[tag]/[...page].astro` | `/articles/tag/<tag>/…` |
| `src/pages/artworks/[...page].astro` | `/artworks`, `/artworks/2` … |
| `src/pages/artworks/[id].astro` | `/artworks/<id>` |
| `src/pages/artworks/tag/[tag]/[...page].astro` | `/artworks/tag/<tag>/…` |
| `src/pages/api/og/articles/[slug].png.ts` | `/api/og/articles/<slug>.png` |
| `src/pages/api/og/artworks/[slug].png.ts` | `/api/og/artworks/<id>.png` |
| `src/pages/404.astro` | `/404` |

ページネーションは Astro の `paginate()` を使用。ページ番号リンクは `src/lib/fs.ts` の `pageIdGen()`（1..N の配列）を `PageBar` に渡して描画する。

## 4. コンテンツ

### 記事・About（`src/content.config.ts`）

`astro:content` の glob loader。

```ts
loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" })
schema: z.object({ emoji, title, description, date, tags, published })
```

- ID はファイルパス由来でディレクトリ階層を含む。`index.mdx` はディレクトリ名が ID になる。
- 下書き除外は各ページの `getCollection` フィルタで実装:
  `import.meta.env.PROD ? data.published : true`
- About コレクションはスキーマなし（`about.mdx` 1 件のみ）。

### 作品（`src/data/db.json`）

- 静的 JSON を `src/lib/artworks.ts` が読み込む。
- `getArtworks()` は配列を `toReversed()` して返す（新しい順）。
- ページング・タグ絞り込みも同ファイル内の関数（`getArtworksShown` / `getTaggedArtworks` / `getTaggedArtworksShown`）。
- 画像実体は `public/images/artworks/` にあり、`import.meta.glob` で `ImageMetadata` として解決する。

## 5. Markdown / MDX パイプライン

### remark

| プラグイン | 対応する機能要件 |
| --- | --- |
| `remark-gemoji` | 絵文字ショートコード |
| `remark-denden-ruby` | ルビ |
| `remark-math` | 数式 |
| `src/lib/remark-link-card.ts`（自作） | リンクカード判定 |

`remarkRehype` オプション: `allowDangerousHtml: true`, `footnoteLabel: "脚注"`

**自作リンクカードプラグインの判定ロジック**（`src/lib/mdast-util-node-is.ts` の `isBareExternalLink` と併用）:
段落の子が 1 個で、それが裸の外部リンクなら `hProperties.linkcard = true` を付け、段落を剥がしてリンクノードで置換する。

### rehype

| プラグイン | 対応する機能要件 |
| --- | --- |
| `rehype-slug` | 見出しアンカー ID |
| `rehype-autolink-headings`（`behavior: "wrap"`） | 見出しのリンク化 |
| `rehype-katex` | 数式レンダリング |
| `rehype-unwrap-images` | 画像を `<p>` から取り出す |

KaTeX の CSS は `src/pages/articles/[slug].astro` で `katex/dist/katex.min.css` を import。

### シンタックスハイライト

`astro-expressive-code`:

- テーマ: `github-dark` / `github-light`
- プラグイン: `@expressive-code/plugin-line-numbers`, `@expressive-code/plugin-collapsible-sections`
- `defaultProps`: `showLineNumbers: false`, `collapse: "30-9999"`
- `styleOverrides`: `borderColor: var(--border)`、フレームの box-shadow を無効化
- Shiki に **Caddyfile の TextMate 文法を GitHub から fetch して追加登録**（`cache: "force-cache"`）。ビルドがネットワークに依存する。

### コンポーネント差し替え

記事・About のレンダリング時に MDX の要素を差し替える。

```ts
const components = { img: ImageHandler, a: LinkHandler }
```

- `ImageHandler`: `src` が文字列なら素の `<img>`、`ImageMetadata` なら最適化済み `<Image>`（`max-h-110` + 上下ボーダー）
- `LinkHandler`: `linkcard` プロパティがあれば `LinkCard`、なければ通常の `<a>`

### 目次

`render()` が返す `headings`（`MarkdownHeading[]`）を `ArticleToc.astro` に渡す。

- `depth <= 3` でフィルタ
- インデントは `pl-0` / `pl-8` / `pl-16`
- 折りたたみはインライン `<script>` で `collapsed` クラスをトグル

## 6. 画像最適化（`src/components/Image.astro`）

`astro:assets` の `<Picture>`。

- `formats: ["avif"]`, `quality: 70`
- 高さ = `min(src.height * 700 / src.width, 540)`、幅はそこからアスペクト比で逆算
- `pictureAttributes` に `aspect-ratio: ${w} / ${h}` を設定（CLS 対策）
- `priority` prop で eager 読み込みを切り替え
- `category !== "artwork"` のときのみ `<figcaption>` に alt を表示

## 7. リンクカードのメタ取得（`src/lib/fetchMeta.ts`）

cheerio でパースし、sharp でサムネイルを生成する。

- **2 段階の User-Agent 試行**: ブラウザ相当 UA → 失敗したら Discordbot UA（SPA サイト対策）
- **リトライ**: 最大 2 回。対象は 5xx とネットワークエラー / タイムアウト。線形バックオフ（1s, 2s）、タイムアウト 15 秒
- **画像の解決順**: `og:image` → `og:image:url` → `itemprop=image` → `twitter:image` → `apple-touch-icon`
- **相対 URL の絶対化**
- **サブドメインのフォールバック**: 画像が取れず、かつサブドメイン（`co.jp` 等の国別 TLD と `www` は除く）なら親ドメインの OGP 画像を試す
- **タイトルのフォールバック**: OGP が無くても `<title>` があればそれを使う
- **サムネイル生成**: 高さ 120px・quality 30 の webp。ファイル名は URL の SHA-256 先頭 16 文字。出力先は `out/images/ogp_link/`（dev では `public/images/ogp_link/`）
- **キャッシュ**: プロセス内 `Map` のみ。**ビルドごとに全件を再取得している**
- 取得失敗時もデフォルトサイズ（1200×630）で URL を返し、ビルドは落とさない

## 8. OGP 画像生成

`satori` + `sharp` で PNG（1200×630）を生成。React JSX（`/** @jsxImportSource react */`）で記述。

- フォント: `src/assets/NotoSansCJKjp-Bold.woff`
- アイコン: `src/assets/omemoji.png`（base64 埋め込み）
- 背景 `#d50000` の外枠 + 白いカード。タイトルを 4rem で中央寄せ
- **`budoux` で日本語を文節分割**し、`<span style="display: block">` 単位で折り返す
- 記事用 `src/components/OgImage/` と作品用 `src/components/OgArtworkImage/` の 2 種類
- エンドポイントは `getStaticPaths` で全 slug を列挙し、`Response` に PNG バイト列を載せて返す

## 9. `<head>`（`src/layouts/Layout.astro`）

各ページが `title` / `description` / `category` / `path` / `og` を渡す。

- 基本: `title`, `description`, `application-name`, `author`, `creator`, `publisher`, `generator`, favicon
- `link rel="alternate" type="application/rss+xml" href="/rss.xml"`（**フィード本体は未実装**）
- `link rel="sitemap" href="/sitemap-index.xml"`
- OGP: `og:title`, `og:description`, `og:url`, `og:site_name`
- Twitter: `twitter:site` / `twitter:creator` = `@omemoji_art`, `twitter:title`, `twitter:description`
- `og.enabled` のとき追加で `og:image`（既定 `/omemoji.png` 720×720）、`og:image:width/height`、`og:type`、`twitter:card`（`article` なら `summary_large_image`、それ以外 `summary`）

Google Analytics（`G-XXCZ8KW3CC`）は `setTimeout` 2500ms 後に `<script>` を動的挿入する。

## 10. サイトマップ

`@astrojs/sitemap` の `filter` で除外。

```ts
filter: (page) =>
  !page.includes("/artworks/tag") &&
  !page.includes("/articles/tag") &&
  !page.match(/\/artworks\/[0-9]+\//) &&
  !page.match(/\/articles\/[0-9]+\//)
```

> **要確認**: 記事 slug は `2025/03/...` のように数字セグメントで始まるため、最後の 2 条件が記事・作品の詳細ページまで除外している疑いがある。生成対象パスと除外ルールが `getStaticPaths` と `astro.config.ts` に分かれた二重管理になっているのが原因。

## 11. 定数（`src/lib/constant.ts`）

```ts
WIDTH_MAIN = 700
COUNT_PER_PAGE = 7        // 記事一覧
ARTWORKS_PER_PAGE = 9     // 作品一覧
HOST = "omemoji.com"
```

## 12. CI / CD

### `.github/workflows/ci.yml`（`workflow_call`）

Node LTS + Bun をセットアップし、以下を順に実行する。

1. bun install キャッシュ（キー: `bun.lock` のハッシュ）
2. Astro アセットキャッシュ（`node_modules/.astro`、キー: `src/**` + `public/images/**` + `astro.config.ts`）
3. `bun install --frozen-lockfile`
4. `bun run check:ci`（Biome の lint + format チェック）
5. `bunx astro sync`（型生成）
6. `bun run typecheck`（`tsc --noEmit`）
7. `bun run build`
8. 条件付きで `out/` を artifact にアップロード

### `.github/workflows/deploy.yml`

- トリガー: `main` への push / `main` 向け PR
- artifact をアップロードするのは「main への push」または「Dependabot の major 更新 PR」のみ（patch は自動マージされるためプレビュー不要）
- `cloudflare/wrangler-action@v3` で `pages deploy ./out`
- Dependabot PR は `--branch=dependabot-<PR番号>` でプレビュー環境にデプロイし、URL を PR にコメント

### その他

- `dependabot.yml`（bun エコシステム、patch / minor / major でグループ分け）
- `dependabot-auto-merge.yml`
- `cleanup_cache.yml`

## 13. コード品質設定

**Biome**（`biome.json`）:

- 2 スペース、行幅 100、ダブルクォート、セミコロンあり、ES5 trailing comma
- `noNonNullAssertion` と `noExplicitAny` は off
- CSS は Tailwind ディレクティブと CSS Modules を有効にしてチェック
- 除外: `node_modules`, `out`, `.astro`, `bun.lock`, `public`, `*.min.js`
- `.astro` ファイルは `useImportType` / `noUnusedVariables` / `noUnusedImports` を off

**TypeScript**（`tsconfig.json`）:

- `astro/tsconfigs/strict` を継承
- `types: ["bun"]`、`jsx: "react-jsx"`、`jsxImportSource: "react"`
- パスエイリアス `@/*` → `./src/*`
- プラグイン: `@astrojs/ts-plugin`
