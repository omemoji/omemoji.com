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
- **Phase 1** — スキーマ・作品データ移行・`_schema.json`・ローダ。`src/data/db.json` と `public/images/artworks/` は削除済み
- **Phase 2** — unified パイプライン・目次収集・expressive-code・hast → React
- **Phase 3** — `build.ts` / `dev.ts` / `ArticlePage` / 共通レイアウト。記事 15 本が生成できる
- **Phase 4** — 画像の URL 規則（`/images/<種別>/<id>/<ファイル名>`）・複製・`Image` の境界
- **Phase 5** — 残りの 5 ページとコンポーネント第 2 弾。**本番ビルドが 85 ページ**を出す
- **Phase 6** — 画像の最適化（AVIF・寸法マニフェスト・永続キャッシュ）。ページ側は無変更で済んだ
- **Phase 9**（前倒し）— CI を `main.yml` + `_ci.yml` / `_build.yml` / `_deploy.yml` に再編し、`bun test` を追加

### 未着手

`features/og/**`、`features/link-card/parse.ts` は未着手。`scripts/new-artwork.ts` も未着手。

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
│   ├── tags.ts                      # TAGS（タグの一覧）/ tagLabels（日本語ハッシュタグ）
│   ├── query.ts                     # filterByTag / sortByDate / collectTags
│   └── paginate.ts                  # paginate / pageIdGen / pageCount
├── features/                # ビルドのステージ
│   ├── markdown/  image/  og/  link-card/
├── components/  pages/  layouts/  styles/  assets/
└── tests/                   # テスト用フィクスチャ（実データを 1 度だけ読む）
```

**規則 2 つ:**

- ドメインでディレクトリを切り、各ドメイン内で **I/O を関数の内側に閉じる**（import 時に副作用を起こさない）
  - `routes.ts` は `buildRoutes(content)` としてコンテンツを注入で受け取る。読み込みは `build.ts` / `dev.ts` の責務
- **`src/features/**` は `components` / `layouts` / `pages` / `routes` を import しない** — テストで検査する（**未実装**）

---

## Phase 1: コンテンツ層（完了）

UI なしで記事と作品を型付きで読み出せる状態にする。

1. **zod スキーマ** — 記事 / 作品。
2. **作品データの移行**（使い捨てスクリプト）— `src/data/db.json` の 23 件 → `content/artworks/<id>/meta.json`。画像を各ディレクトリへ移動
   - `src` の Vite glob キー（`/public/images/artworks/...`）を相対パスへ
   - 配列順（`toReversed()`）から `date` を起こす。元の並び順を保持できる値を割り当てる
3. **`_schema.json` の生成**（`scripts/gen-schema.ts`）
4. **ローダ** — `content/articles.ts` / `artworks.ts`。走査 → パース → **zod 検証**。ID はパス・ディレクトリ名から導出

### テスト

全記事・全作品がスキーマを通ること / `_schema.json` が zod と一致すること / ページネーションの境界 / タグ集計 / 下書きが本番で除外されること

### 完了条件

`bun test` が通り、`src/data/db.json` と `public/images/artworks/` を削除できている

> **タグ名の変更は URL の変更**（`/artworks/tag/<tag>`）。整理する場合はリダイレクトの要否を判断する。`src/content/tags.ts`（`TAGS` と、タグ → 日本語ハッシュタグの `tagLabels`）も同時に更新する。

---

## Phase 2: Markdown パイプライン（完了）

最も壊れやすい部分をここで確定させる。

1. **unified 移植** — remark: frontmatter / gemoji / denden-ruby / math / link-card、`remarkRehype`（`allowDangerousHtml`, `footnoteLabel: "脚注"`）、rehype: slug / autolink-headings / katex / unwrap-images
2. **目次収集**（`headings.ts`）— depth ≤ 3
3. **expressive-code**（`highlight.ts`）— テーマ・プラグイン・`defaultProps` を移植
   - **CSS と JS は `rehype-expressive-code` が hast へ自動注入する**（`codeStyles()` と完全一致する 24 KB が木の中にある）。`<head>` にも入れると二重になる
   - `.use()` の順序に相互依存がある（slug/autolink → katex → expressive-code → raw）。理由は `pipeline.ts` のコメントとテストを参照
4. **hast → React**（`render.tsx`）— `toReact(tree, components)` として**汎用に保つ**。差し替え表は `components/MarkdownComponent.tsx` が供給する
5. KaTeX CSS を `globals.css` から `@import` (optional)

### テスト

記法ごとのスナップショット（絵文字 / ルビ / 数式 / 脚注 / 生 HTML / 見出しアンカー / コードブロック / Caddyfile / リンクカード判定 / 目次 0 件）

### 完了条件

実際の記事 20 本が例外なく変換できる

---

## Phase 3: 縦の 1 本（完了）

記事 1 本がブラウザで正しく読める状態にする。**最初の大きなマイルストーン。**

`routes.ts` は Phase 5 相当まで生成済みだが、**この Phase で書いたページは `ArticlePage` だけ**とした。
残りのページは空のままにし、`build.ts` が未実装ページを飛ばす。縦に 1 本通す原則を優先した。

1. **`src/routes.ts` の補完**
   - **`indexable` を `Route` に追加**（Phase 7 のサイトマップが `filter(r => r.indexable)` を前提にしている）。詳細ページと一覧 1 ページ目のみ `true`、タグ別とページネーション 2 ページ目以降は `false`
   - ページ名をファイル名に合わせる（`About` → `AboutPage`）。ビルドがページ名からコンポーネントを引くため、機械的に対応している必要がある
   - `render` は持たせない。ページ名の文字列で参照し、実体の解決はビルド側に置く（`routes.ts` が全ページを import しないため）
2. **`scripts/build.ts`** — コンテンツを読み込み → `buildRoutes` → `out/` へ書き出し
   - 出力は `build.format: "file"` 相当（`/articles/2.html`）
   - **未実装ページはスキップ**する。`pages` レジストリに載せた分だけ描画される
   - **下書きの除外をここで行う**（`published: false`。本番のみ除外し、dev では表示する）
   - Markdown の変換が非同期なので、**ページは「要素を返す非同期関数」として扱う**。`build.ts` が `await` してから `renderToStaticMarkup` に渡す
3. **コンポーネント第 1 弾** — `Layout` / `Header` / `Footer` / `ArticleToc`（`src/layouts/` を新規に切った）
   - `.astro` → React JSX（`class` → `className`、`<slot />` の書き換え）
   - **Tailwind ユーティリティをセマンティックなクラス名へ**
   - expressive-code の CSS は木に入っているので `<head>` に足さない（Phase 2 の注記）
   - 現在地の表示は class ではなく `aria-current="page"`、目次の折りたたみはスクリプトではなく `<details>` に置き換えた
4. **`ArticlePage`** — 目次・本文・前後リンク。`TopArticle` / `SNSList` も併せて移植した
5. `globals.css` と `public/` を `out/` へコピー
6. **`scripts/dev.ts`** — **同じ `routes.ts` を使うオンデマンド生成**（§7.3）。`build.ts` と `renderRoute` を共有するため、dev だけ出力が違うことは起き得ない

### テスト

`indexable` の割り当て（タグ別・2 ページ目以降が `false`）/ 下書きが本番ビルドで除外され dev では残ること /
`out/` に想定のパスが生成されること（一時ディレクトリへ書き出す統合テスト）

### 完了条件

`out/articles/<slug>.html` を開いて、目次・コードハイライト・数式・ルビ・脚注が正しく表示される（画像とリンクカードは未対応でよい）

### 残件

- `Top` / `Back` / `shareButton` — それぞれ `AboutPage` と共有ボタンに紐づくため **Phase 5 へ移す**
- **`src/features/**` が `components` などを import していないこと**のテスト（構成の規則）
- ライブリロードとエラー画面の整形は Phase 8

---

## Phase 4: 画像の配線（完了）

**最適化の前に、画像が「出る」状態にする。** ここは最適化ではなくアセットの配線であり、
これが無いと Phase 5 の作品ページ（中身が画像そのもの）を検証できない。

1. **画像の URL 設計** — `features/image/assets.ts` が単一の定義元

   ```
   /images/articles/<slug>/<ファイル名>
   /images/artworks/<id>/<ファイル名>
   ```

   **ルート絶対**にする。相対にすると参照元の深さで解決先が変わり、詳細ページでしか正しく動かない。
   実測では `/articles`（一覧 1 ページ目）と `/articles/2`（2 ページ目）ですら解決先が違う。
   一覧にサムネイルを並べる Phase 5 で必ず破綻する。

   **`<slug>` / `<id>` で区切る**。平置きにすると記事をまたいだ同名画像が上書きされる
   （実際に `fastfetch.png` が 2 記事にある）。

   HTML と同じ階層（`out/articles/<slug>/`）に入れる案もあるが、`out/articles/<slug>.html` と
   ディレクトリが併存し、Cloudflare Pages がどちらへ解決するかの確認が要る。`images/` に分ければ不要。

2. **原寸画像のコピー** — `copyAssets` の延長。`public/` と同じ扱いで `out/` へ複製する
   - dev は `content/` に置いたまま、**ビルドと同じ対応表**から引いて配信する
3. **`Image` / `ImageHandler` の骨格** — 現時点の実装は原寸をそのまま出すだけ
   - **コンポーネントの境界をここで固定した。**Phase 6 は内側だけを差し替え、ページには触れない
   - 本文画像はキャプションあり（`<figure>` + `<figcaption>`）、作品画像はなし
   - 本文の相対参照（`![alt](fastfetch.png)`）は `mdToHast` の `imageBase` オプションで書き換える。
     プロセッサは freeze して使い回すため、記事ごとに変わる値はプラグインではなく後処理で当てる

### テスト

`out/` に全記事・全作品の画像が存在すること / **HTML 内のルート絶対な参照がすべて実ファイルに解決すること**（15 ページ・109 参照）

### 完了条件

`/articles/<slug>` の画像がブラウザに表示される（AVIF 化は未対応でよい）。
`/artworks/<id>` は Phase 5 でページを実装した時点で確認する

---

## Phase 5: 残りのページ（完了）

サイトとして繋がった状態にする。スキップは解消され、**本番ビルドは 85 ページ**になった。

- **コンポーネント第 2 弾** — `ArticlesList` / `PageBar` / `Gallery` / `GalleryRow` / `Top` / `Back` / `ShareButton`
- 残りのページ（`ArticlesList` / `ArtworksList` / `ArtworkPage` / `AboutPage` / `NotFoundPage`）を実装
  - **ルート自体は `routes.ts` に生成済み**だった。404 だけはルートが無いので追加した（`indexable: false`）
  - `about.md` は 1 件しかなく frontmatter も無いため、`content/about.ts` はスキーマを持たない
- 移植時の判断
  - 一覧カードは `div` で組む。`article` にすると本文向けの `article h2` の装飾を拾う
  - ページ送りの URL 規則は `routes.ts` の `paginateRoutes` と同じ（1 ページ目だけ番号を付けない）。
    **ずれるとリンク先が 404 になる**ため、`PageBar` は基点のパスを受け取る形にした
  - `PageBar` / `Back` の矢印は `react-icons` を入れず inline SVG にした
  - `GalleryRow` の初期スクロール位置だけは CSS で決められないため、最小限のスクリプトを添える
  - `Header` の `category` は省略可能。404 はどのメニューも現在地にしない

### 完了条件

全ルートが生成される（本番は下書きを除いた 85）/ `out/404.html` が存在 / 下書きが本番ビルドに含まれない /
`build.ts` の「未実装のページは出力されない」テストを削除できている

### 残件

`scripts/new-artwork.ts`（[03](./architectures/03-cms.md) §1）は未着手

---

## Phase 6: 画像の最適化（完了）

Phase 4 で境界を切ってあったため、**ページ・レイアウト・Markdown の差し替え表は無変更**で済んだ。

1. **ステージ境界**（§7.12）— `features/image/optimize.ts`。入力ファイル一覧 → AVIF + **寸法マニフェスト**
   - マニフェストのキーは**元画像の配信 URL**。ページ側が組み立てる文字列と一致させるため、
     `ImageAsset` に `url` を持たせて `imageUrl` から起こす（エンコードのずれが起きない）
2. **変換** — AVIF quality 70、幅 700px 基準・高さ 540px 上限。同時実行数を 8 に絞る
   - **元より大きくはしない**（`withoutEnlargement`）。マニフェストには**実際に出力された寸法**を載せる
   - svg・gif のようにラスタでないものは変換せず原寸のまま。マニフェストに載らず寸法も付かない
   - **原寸も `out/` に残す**。作品ページの「原寸を直接開く」導線がこれを指している
   - **AVIF 非対応の環境では原寸へ倒す** — `<picture>` + `<source>`。`img` の `src` を `.avif` にすると
     代替が無く空白になる（劣化ではなく全滅）。原寸は上記の理由で既に出しているため、変換もファイルも増えない
3. **永続キャッシュ** — `.cache/images`（Git 管理外）。
   キー = `hash(入力バイト + 変換パラメータ + PIPELINE_VERSION + 変換器のバージョン)`
   - ファイル名も mtime も含めない。同じ画像が別の記事にあれば変換は 1 回で済み、`git clone` でも作り直しにならない
   - **変換器（sharp / vips / aom / heif）のバージョンを含める。** これが無いと sharp を上げても
     古いエンコーダの出力が当たり続け、CI は緑のまま生成物だけが据え置かれる。
     Dependabot の自動マージが patch / minor を人の目を通さずに入れるため、ここは自動で効く必要がある
   - CI は `actions/cache` で持ち越す。**実測 11s → 0.8s**（92 枚）
4. **dev では AVIF を生成しない** — 原寸配信 + 寸法だけを測る（`measureImages`）。
   ファイルの構成と更新時刻が変わらない限り測り直さない

### 描画への受け渡し

ページは「要素を返す関数」であってコンポーネントツリーではないため、React の context は末端の
`Image` まで届かない。props で引き回すと全ページの引数が変わり、Phase 4 の境界を破る。
そのため **`features/image/manifest.ts` に置き場を作り、ビルド / dev が描画の前に 1 度差し込む**形にした。
`Image` は `width` / `height` に加えて `aspect-ratio` も出す（`inline-size: 100%` に負けるため）。

`<picture>` を組み立てる部分は `Picture` として切り出し、ギャラリー（一覧・帯）も同じ経路を通す。
本文と一覧で対応が食い違うと、片方だけ映って片方が真っ白という状態になる。
`picture` は `display: contents`（包む前とレイアウトを同じに保つ）。
**変換していない場合は包まない** — dev のマニフェストは原寸を指すため、
ここを見ないと PNG を `image/avif` だと名乗る `<source>` が出る。

### 完了条件

AVIF が出力され `aspect-ratio` が付く / **2 回目のビルドで画像処理が丸ごとスキップされる** / dev で変換が走らない — いずれも達成

---

## Phase 7: 周辺機能

1. **リンクカード** — `fetch-meta.ts` から純粋部分を `parse.ts` へ分離。**`fetch` を引数で注入可能に**。`.cache/link-meta.json` へ永続化。dev はネットワークを叩かない
2. **OGP 画像** — satori + budoux。**現行が既に React JSX なので JSX の書き換えは不要**。キャッシュは Phase 6 と同方式
   - `Layout` の `og:image` / `og:type` / `twitter:card` はここで足す（テキスト系のメタタグは Phase 3 で移植済み）
3. **サイトマップ** — `routes().filter(r => r.indexable)` から生成。収録ルールを [`requirements.md`](./requirements.md) §9 に沿って書き直す

### テスト

`fetch-meta` の分岐（2 段階 UA / リトライ / サブドメインフォールバック / 全失敗）— fetch 注入により実ネットワーク不要
サイトマップにページネーション 2 ページ目以降とタグ別が含まれないこと / 全記事・全作品に OGP がある

---

## Phase 8: 開発サーバの仕上げ

ライブリロード（SSE）/ CSS は `<link>` の `href` 差し替え / `bun --hot` 対応（`globalThis` にハイライタを退避）/ エラーを HTML で返す

### 完了条件

起動が即時 / Markdown 編集が数百 ms で反映 / CSS がリロードなしで反映

---

## Phase 9: CI / CD（完了・前倒し）

- トリガーを持つ入口を `main.yml` 1 本にし、各工程を `_ci.yml` / `_build.yml` / `_deploy.yml` へ切り出した
  - `_ci.yml` は Lint & Format / Typecheck / Test を**並列実行**。共通のセットアップは `.github/actions/setup`
  - デプロイの条件は `main.yml` の `deploy` ジョブに置き、CI 側から入出力を排した
  - ブランチ保護は `CI Success` ジョブのみを見ればよい
- ~~残件: `bun run build` が成果物を出さないため、`upload-artifact` は空振りする~~ — **解消**。Phase 3 で記事ページが出るようになった

---

## Phase 10: 検証と切り替え

1. **本番同等ビルド**（dev の簡略化を無効化）— `bun run build && bun run preview` で `out/` をそのまま配信して見る。
   `scripts/preview.ts` は拡張子の補完（`/articles/2` → `articles/2.html`）だけを Cloudflare Pages と同じに真似る
2. **現行サイトとの差分比較** — `https://omemoji.com/` から全ページを取得し、**テキスト内容**を照合するスクリプトを書く（クラス名は変わるので完全一致は目指さない）
3. **リンク切れ検査** — `out/` 内の内部リンクの参照先がすべて存在すること
4. `README.md` の「使用している技術」を更新
5. `main` へマージ

---

## リスク

| リスク                                    | 対処                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| ~~画像の最適化を後ろへ回したことで、ページ側の書き直しが発生する~~ | **解消**。Phase 6 の変更は `Image` の内側とマニフェストの差し込みに収まり、ページは無変更 |
| 画像パイプラインが重い                    | 独立フェーズにしてある。ステージ境界を切ってあるので最悪 sharp を CLI（`vips` / `avifenc`）に差し替えられる |
| ~~expressive-code の CSS 注入が動かない~~ | **解消**。Phase 2 で確認したとおり hast へ自動注入される                                                    |
| ルビ・KaTeX の出力が変わる                | Phase 2 のスナップショットと Phase 10 の差分比較で検出                                                       |
| 作品の `date` 割り当てで並び順が変わる    | Phase 1 でテストにより順序を固定                                                                            |
| タグ enum 化で URL が変わる               | 上記 Phase 1 の注記を参照                                                                                   |

## 未決事項

- **サイトマップの収録ルール** — 現行の除外条件が詳細ページまで巻き込んでいる疑い（[`current-implementation.md`](./current-implementation.md) §10）
- **RSS** — 未実装。移植と同時に実装するかは別途判断
- **`.cache/` を Git 管理するか** — 画像は **Git 管理外**に決定（再生成でき、CI は `actions/cache` で持ち越せる）。
  リンクカードのメタデータだけは、参照先サイトの消滅に備えてコミットする選択肢が残る
- **`simple-icons` の扱い** — フッタの SNS アイコンのために追加した。ビルド時にしか使わないため `devDependencies` へ移せる可能性がある
