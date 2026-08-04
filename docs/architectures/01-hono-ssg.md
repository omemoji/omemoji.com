# ディレクトリ・アーキテクチャ案（Hono SSG）

> **不採用。** 記録として残す。採用案は [`02-no-framework-ssg.md`](./02-no-framework-ssg.md)。
>
> 本案は「Hono を使う」を前提に置いた時点での設計であり、フレームワークの選定そのものは行っていない。
> 改めて評価したところ、Hono はサーバフレームワークであり、その価値（ミドルウェア・ルーティング性能・
> エッジランタイム可搬性）はランタイムにサーバを持たない静的サイトでは効かない一方、
> `ssgParams` によるパス列挙・Content-Type からの拡張子推測・ネスト slug のルータ設定といった
> コストだけが残ると判断した。詳細は 02 の §1 を参照。
>
> ただし本案の以下の内容は 02 でもそのまま有効である。
>
> - §1 の移植方針の対応表（Astro が肩代わりしていた機能の棚卸し）
> - §3.5 の画像最適化に関する検討
> - §3.6 expressive-code の CSS 注入
> - §3.7 リンクカードのキャッシュ永続化

[`requirements.md`](../requirements.md) に整理した機能要件を、Hono（SSG）でどう実現するかの設計案。
現行 Astro 実装の詳細は [`current-implementation.md`](../current-implementation.md) を参照。

## 1. 移植方針の全体像

Astro が肩代わりしていた機能のうち、Hono には無いものが 4 つある。設計の争点はこの 4 つをどこに置くか。

| 領域 | Astro | Hono SSG での代替 | 難度 |
| --- | --- | --- | --- |
| ルーティング | `src/pages/**` + `getStaticPaths` | `app.get()` + `ssgParams()` | 低 |
| コンテンツ取得 | `astro:content`（glob loader + zod） | **自作ローダ**（`import.meta.glob` + zod） | 中 |
| MDX | `@astrojs/mdx` | `@mdx-js/rollup`（`jsxImportSource: hono/jsx`） | 中 |
| remark / rehype | 設定で列挙 | **そのまま流用可**（フレームワーク非依存） | 低 |
| コードハイライト | `astro-expressive-code` | `rehype-expressive-code` + CSS の手動注入 | 中 |
| 画像最適化 | `astro:assets` の `<Picture>` | **自作**（`vite-imagetools` or sharp パイプライン） | **高** |
| 見出し / TOC | `render()` の戻り値 `headings` | 自作 rehype プラグインで収集 | 低 |
| OGP 画像 | `.png.ts` エンドポイント | Hono ルートで `image/png` を返す | 低 |
| リンクカード | `lib/fetchMeta.ts` | **ほぼそのまま流用可** | 低 |
| サイトマップ | `@astrojs/sitemap` | 自作ルートで XML 生成 | 低 |
| Tailwind | `@tailwindcss/vite` | **そのまま**（Vite プラグイン共通） | – |
| 出力形式 | `format: "file"` | Hono `toSSG` の既定挙動と一致 | – |
| デプロイ | `out/` を Cloudflare Pages | **変更なし** | – |

## 2. ディレクトリ構成

```
omemoji.com/
├── vite.config.ts             # ssg + devServer + mdx + tailwind + imagetools
├── package.json
├── tsconfig.json              # jsxImportSource: "hono/jsx"
├── biome.json
├── docs/
├── public/                    # そのまま out/ へコピー
└── src/
    ├── index.tsx              # Hono アプリのエントリ。routes/ を合成して export default
    ├── routes/                # ルート定義のみ。JSX は components/ に委譲する
    │   ├── index.tsx          # /
    │   ├── articles.tsx       # /articles, /articles/:page, /articles/:slug, /articles/tag/...
    │   ├── artworks.tsx       # /artworks 系
    │   ├── og.tsx             # /api/og/articles/:slug.png, /api/og/artworks/:id.png
    │   ├── sitemap.tsx        # /sitemap.xml
    │   └── notfound.tsx       # /404
    ├── layouts/
    │   └── Layout.tsx         # <html> / meta / OGP / GA
    ├── components/            # 純粋な presentational コンポーネント（Hono JSX）
    │   ├── Header.tsx  Footer.tsx  Top.tsx  TopArticle.tsx
    │   ├── ArticlesList.tsx  PageBar.tsx  ArticleToc.tsx  Back.tsx
    │   ├── Gallery.tsx  GalleryRow.tsx  Image.tsx  SNSList.tsx  ShareButton.tsx
    │   └── mdx/               # MDX の要素差し替え
    │       ├── ImageHandler.tsx
    │       ├── LinkHandler.tsx
    │       └── LinkCard.tsx
    ├── content/               # 現状のまま移動（mdx + 併置画像）
    │   ├── about/
    │   └── articles/
    ├── data/                  # db.json, dictionary.json
    ├── lib/
    │   ├── content/           # astro:content の代替レイヤ
    │   │   ├── schema.ts      # zod スキーマ
    │   │   ├── articles.ts    # 読み込み・検証・ソート・タグ抽出・ページング
    │   │   ├── artworks.ts    # db.json ベース（既存流用）
    │   │   └── about.ts
    │   ├── routes-manifest.ts # 全静的パスの単一の真実。ssgParams と sitemap が共有
    │   ├── mdx/
    │   │   ├── plugins.ts     # remark/rehype 構成（vite.config.ts から import）
    │   │   ├── rehype-collect-headings.ts
    │   │   └── components.tsx # { img: ImageHandler, a: LinkHandler }
    │   ├── remark-link-card.ts     # 既存流用
    │   ├── mdast-util-node-is.ts   # 既存流用
    │   ├── link-card/
    │   │   └── fetch-meta.ts  # 既存 fetchMeta（+ ディスクキャッシュ化）
    │   ├── og/
    │   │   ├── article.tsx    # 既存 OgImage
    │   │   └── artwork.tsx    # 既存 OgArtworkImage
    │   ├── image.ts           # サイズ計算 + srcset ヘルパ
    │   ├── pagination.ts      # pageIdGen 相当
    │   └── constant.ts
    ├── styles/
    │   └── globals.css
    └── assets/                # NotoSansCJKjp-Bold.woff, omemoji.png
```

## 3. 設計上の判断

### 3.1 `routes/` は薄く保つ

Hono のベストプラクティスは「ハンドラにロジックを書かない」。`routes/*.tsx` は `ssgParams` にパス一覧を渡して `c.html()` するだけにし、データ取得・整形は全て `lib/content/` に寄せる。

Astro では frontmatter スクリプトにデータ取得と描画が同居していたが、これを分離することでコンテンツ層を単体でテストできるようになる。

```tsx
// routes/articles.tsx（イメージ）
const app = new Hono()

app.get('/articles/:slug{.+}', ssgParams(() => articlePaths()), async (c) => {
  const article = await getArticle(c.req.param('slug'))
  if (!article) return c.notFound()
  return c.html(<ArticlePage article={article} />)
})
```

### 3.2 `routes-manifest.ts` を単一の真実にする

現状は `getStaticPaths` と `astro.config.ts` の sitemap filter で生成対象が二重管理になっており、正規表現ベースの除外ルールが意図とずれている疑いがある（[`current-implementation.md`](./current-implementation.md) §10 参照）。

Hono では生成対象パスを 1 箇所で組み立て、`ssgParams` とサイトマップの両方がそれを参照する。除外ルールを正規表現ではなくフラグで宣言できる。

```ts
// lib/routes-manifest.ts（イメージ）
export type RouteEntry = { path: string; indexable: boolean }

export const articleRoutes = (): RouteEntry[] => ...   // indexable: true
export const tagRoutes = (): RouteEntry[] => ...       // indexable: false
export const paginationRoutes = (): RouteEntry[] => ... // 1 ページ目のみ indexable

export const sitemapUrls = () => allRoutes().filter(r => r.indexable)
```

### 3.3 ネストした slug の扱い

記事 ID はディレクトリ階層を含む（`2025/03/golden_kamuy/golden_kamuy`）。Hono の `:slug` は `/` にマッチしないため、正規表現パラメータが必須。

```ts
app.get('/articles/:page{[0-9]+}', ...)   // 先に登録
app.get('/articles/tag/:tag/:page{[0-9]+}', ...)
app.get('/articles/:slug{.+}', ...)       // 後に登録（catch-all）
```

登録順に依存するため、**最初のスパイクで実挙動を確認すること**。

### 3.4 MDX のコンポーネント差し替え

`providerImportSource` を使わず、コンパイル済み MDX コンポーネントに `components` prop を直接渡す。`hono/jsx` 向けの MDX provider を用意しなくて済むため最も素直。

```tsx
const { default: Content, headings } = await import('...mdx')
<Content components={mdxComponents} />
```

`vite.config.ts` の `@mdx-js/rollup` には `jsxImportSource: 'hono/jsx'` を設定し、remark/rehype は `lib/mdx/plugins.ts` から import して設定の二重管理を避ける。

### 3.5 画像最適化（最大の移植コスト）

`astro:assets` の `<Picture formats={["avif"]} quality={70}>` 相当は自作になる。2 案。

**案 A: `vite-imagetools` + 自作 rehype プラグイン（推奨）**

Markdown 内の相対画像パスを ESM import に変換する rehype プラグインを入れ、`vite-imagetools` が avif 変換と width / height を返す。dev サーバでも効くので DX が Astro に近い。

**案 B: ビルド前 sharp スクリプト + マニフェスト JSON**

`scripts/optimize-images.ts` が全コンテンツ画像を走査して `out/images/content/<hash>.avif` を出力し、width / height を含むマニフェストを書く。`<Image>` はマニフェストを引く。実装は単純だが dev サーバとの二重管理になる。

→ **案 A を主軸に進め、Vite プラグインが噛み合わない場合の逃げ道として案 B を用意する。**

いずれの案でも `lib/image.ts` に現状のサイズ計算ロジック（幅 `WIDTH_MAIN = 700` 基準・高さ 540px 上限・`aspect-ratio` 付与）を移植する。

### 3.6 expressive-code の CSS 注入

`rehype-expressive-code` は Astro integration と違い CSS を自動注入しない。`getStyles()` / `getBaseStyles()` の出力を `Layout.tsx` の `<style>` に流し込む処理が必要。

Caddyfile の TextMate 文法を fetch する設定はそのまま持ち込めるが、ビルドがネットワークに依存する点は現状と同じ。

KaTeX の CSS も、記事ページでの動的 import ではなく `globals.css` からの `@import` に寄せるのが素直。

### 3.7 リンクカードのキャッシュ永続化

現状 `fetchMeta` はプロセス内 `Map` のみで、CI ビルドのたびに全外部サイトへ fetch している。移植のついでに `.cache/link-meta.json` へ永続化し、GitHub Actions のキャッシュに載せる。ビルド時間と外部依存の不安定さが同時に改善する。

サムネイル出力先の `out` / `public` 切り替え（`import.meta.env.PROD`）も、Vite 環境変数で同じロジックが使える。

### 3.8 OGP 画像ルート

Hono `toSSG` は Content-Type からファイル拡張子を決める。ルートで `image/png` を返せば `.png` として書き出される。

```ts
app.get('/api/og/articles/:slug{.+}.png', ssgParams(...), async (c) => {
  const png = await renderArticleOg(article.data.title)
  return c.body(png, 200, { 'Content-Type': 'image/png' })
})
```

**スパイクで確認すべき点**: パス末尾の `.png` と `:slug{.+}` の組み合わせが正しくマッチするか、拡張子が二重に付かないか。

### 3.9 404

Cloudflare Pages は `404.html` を Not Found ページとして自動的に使う。`/404` ルートが `out/404.html` として書き出されることを確認する。

### 3.10 出力形式

Hono `toSSG` の既定は、`/articles/2` → `articles/2.html`、`/` → `index.html`。これは Astro の `format: "file"` + `trailingSlash: "never"` と一致するため、Cloudflare Pages 側の設定変更は不要。

## 4. ランタイム / パッケージマネージャ

### 結論: **Bun を継続する**

前提として pnpm はパッケージマネージャ、Bun はランタイム兼パッケージマネージャなので、実際の選択肢は「Node + pnpm」か「Bun」か。そして**成果物は静的ファイルで Cloudflare Pages に置くだけなので、ランタイムはビルド時にしか影響しない**。可逆性の高い決定である。

**Bun を選ぶ理由:**

- 既存の `bun.lock` / Dependabot の bun ecosystem 設定 / CI キャッシュキー（`hashFiles('bun.lock')`）をそのまま流用でき、変更範囲を Astro → Hono に絞れる
- OGP 生成・画像パイプライン・リンクカードキャッシュ更新といった**ビルド用スクリプトが増える**構成なので、`bun run scripts/*.ts` で TS を直接実行できる利点が効く（tsx / ts-node が不要）
- Hono は Bun をファーストクラスでサポートしており、SSG 周りの噛み合わせが良い
- `tsconfig.json` が既に `"types": ["bun"]`

**事前に確認すべき点:**

- **sharp のネイティブバイナリ**。OGP 生成・リンクカードサムネ・画像最適化の全てが sharp 依存。開発機が Asahi Linux（aarch64）のため、まず `bun install && bun -e "import('sharp')"` で動作確認してから進める
- **Vite プラグイン群は公式には Node ターゲット**。`@hono/vite-ssg` や `vite-imagetools` が Bun 上で不調なら、パッケージ管理は Bun のまま `node node_modules/vite/bin/vite.js build` に切り替えれば済む（現行 CI も Node と Bun の両方をセットアップ済み）

**pnpm に乗り換える価値があるケース:** phantom dependency を厳密に排除したい、あるいはネイティブモジュール周りで Bun に踏まれ続ける場合のみ。今回はそのコストを払う理由が無い。

## 5. 実装順序

1. **スパイク** — Hono + `@hono/vite-ssg` + Tailwind で `/` と `/articles/:slug{.+}` だけ通す。ネスト slug・`404.html`・`.png` 拡張子・`.html` 出力の挙動をここで確定させる
2. **コンテンツ層** — `lib/content/` を作り、zod 検証込みで記事・作品を読めるようにする（UI 無しでテスト可能）
3. **MDX パイプライン** — 既存 remark / rehype を移植 → expressive-code → KaTeX CSS → TOC 収集
4. **コンポーネント移植** — `.astro` → Hono JSX。`class:list` と `<slot />` の書き換えが主。`ArticleToc` のインラインスクリプトはそのまま流用
5. **画像最適化** — §3.5 の案 A。独立して重いので分離する
6. **OGP / サイトマップ / 404**
7. **CI 更新** — `astro sync` を削除、Astro キャッシュを Vite キャッシュに差し替え。`out/` は据え置きなので `deploy.yml` は無変更

移植リスクが集中するのは **1（ルーティング挙動）と 5（画像）**。ここを先に潰せば、以降は機械的な作業になる。

## 6. 未決事項

- **素の Hono + Vite か HonoX か** — README に「HonoX で書き直す可能性あり」とある。HonoX ならファイルベースルーティングと islands が付いてくる分、手順 1 と 4 が楽になる代わりに規約に縛られる。本ドキュメントは「Hono（SSG）」の指定どおり素の Hono + Vite 前提で書いている
- **サイトマップの除外ルール** — 現状の正規表現が記事詳細ページを巻き込んでいる疑いがある（[`current-implementation.md`](./current-implementation.md) §10）。あるべきルールは [`requirements.md`](./requirements.md) §9 に記載済み。移植時に意図を確認する
- **RSS** — README の Todo として残っている。移植のタイミングで実装するかは別途判断
