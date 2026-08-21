import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadAbout } from "@/collections/about";
import { loadArticles } from "@/collections/articles";
import { loadArtworks } from "@/collections/artworks";
import { CODE_ASSETS, HOST, KATEX_CSS, STYLESHEET } from "@/config";
import { type AssetManifest, setAssetManifest } from "@/features/asset/manifest";
import { collectImages, type ImageAsset, type ImageSource } from "@/features/image/assets";
import { setImageManifest, takeImageWants } from "@/features/image/manifest";
import {
  type OptimizeResult,
  optimizeImages,
  readWants,
  writeWants,
} from "@/features/image/optimize";
import { type CollectResult, collectLinkCards } from "@/features/link-card/collect";
import { setLinkCardManifest } from "@/features/link-card/manifest";
import { collectAllLinkCardUrls } from "@/features/link-card/urls";
import { codeScript, codeStyles } from "@/features/markdown/highlight";
import { type GenerateResult, generateOgImages, type OgSource } from "@/features/og/generate";
import { setOgManifest } from "@/features/og/manifest";
import { buildSitemap, type SitemapEntry } from "@/features/sitemap/generate";
import AboutPage from "@/pages/AboutPage";
import ArticlePage from "@/pages/ArticlePage";
import ArticlesList from "@/pages/ArticlesList";
import ArtworkPage from "@/pages/ArtworkPage";
import ArtworksList from "@/pages/ArtworksList";
import NotFoundPage from "@/pages/NotFoundPage";
import { buildRoutes, type Content, type PageProps, type Route } from "@/routes";

export const rootDir = path.join(import.meta.dirname, "..");
export const contentDir = path.join(rootDir, "content");
export const outDir = path.join(rootDir, "out");
/** ビルドをまたいで残す変換結果。キーに入力バイトを含むので使い回しても古くならない */
export const imageCacheDir = path.join(rootDir, ".cache/images");
/** リンク先のメタデータ。取得済みの URL は再取得しない */
export const linkCacheFile = path.join(rootDir, ".cache/link-meta.json");
export const linkCacheDir = path.join(rootDir, ".cache/link-card");
/** 生成済みの OGP 画像 */
export const ogCacheDir = path.join(rootDir, ".cache/og");

/**
 * 実装済みのページだけを載せる。ここに無いページはスキップされる。
 * キーは routes.ts の PageProps と同じ集合で、props の型も対応している。
 *
 * Markdown の変換が非同期のため、要素を Promise で返すページも許す。
 * React サーバコンポーネントではなく、単に要素を組み立てる関数として呼ぶ。
 */
const pages: {
  [P in keyof PageProps]?: (props: PageProps[P]) => ReactNode | Promise<ReactNode>;
} = {
  AboutPage,
  NotFoundPage,
  ArticlesList,
  ArticlePage,
  ArtworksList,
  ArtworkPage,
};

/** そのまま配信する静的ファイル。dev サーバもこの 2 つを見る */
export const publicDir = path.join(rootDir, "public");
export const stylesheet = {
  file: path.join(rootDir, "src/styles/globals.css"),
  href: STYLESHEET,
};

/**
 * KaTeX のスタイル。数式のあるページだけが読み込む。
 *
 * CSS はフォントを相対パス（`fonts/...`）で参照するため、CSS とフォントの
 * 位置関係を保ったまま複製する（指紋は名前にしか混ぜないので参照は壊れない）。
 * **woff2 だけを複製する**（woff と ttf も宣言されているが、対応していない
 * ブラウザは実質無く、1.2 MB が 296 KB になる）
 */
export const katex = {
  dir: path.join(rootDir, "node_modules/katex/dist"),
  href: KATEX_CSS,
};

/**
 * サイトの CSS を 1 枚に固めて縮める。
 *
 * **build.ts で `Bun.*` に触れる唯一の箇所。** ランタイム可搬性より依存を増やさない
 * ことを採った（lightningcss を足せば Node のままにできる）。@import も url() も
 * 使っていないため、やっているのは実質 minify だけで、外すなら原本をそのまま返せばよい。
 * 20.0 KB → 16.0 KB、brotli 後で 4.4 KB → 3.0 KB。
 */
export async function siteStyles(): Promise<string> {
  const built = await Bun.build({ entrypoints: [stylesheet.file], minify: true });
  const [output] = built.outputs;
  if (!output) {
    throw new Error(`${stylesheet.file} を変換できなかった`);
  }

  return await output.text();
}

/** 内容から求める短い指紋。ファイル名に混ぜてブラウザのキャッシュを破棄させる */
const fingerprint = (contents: string): string =>
  crypto.createHash("sha256").update(contents).digest("hex").slice(0, 16);

/** `globals.css` → `globals.<指紋>.css`。ディレクトリは変えない（相対参照を保つため） */
export function fingerprinted(name: string, contents: string): string {
  const ext = path.extname(name);

  return `${name.slice(0, -ext.length)}.${fingerprint(contents)}${ext}`;
}

/**
 * 指紋付きの資産を書き出す。**複製ではなく生成する**ので assets には載せない。
 *
 * 名前に内容が反映されるため、更新が確実に届き、同時に恒久キャッシュを効かせられる
 * （`public/_headers`）。指紋の無い名前で出すと、CSS を直したのに古いものが
 * 表示され続ける状態をブラウザ任せにすることになる。
 *
 * コードブロックの CSS と JS は本文へ差し込まず、ここから 1 度だけ書き出す
 * （features/markdown/highlight.ts の getRendererWithoutAssets を参照）
 */
export async function writeAssets(target: string): Promise<AssetManifest> {
  const contents: [string, string][] = [
    [STYLESHEET, await siteStyles()],
    [KATEX_CSS, fs.readFileSync(path.join(katex.dir, "katex.min.css"), "utf-8")],
    [CODE_ASSETS.css, await codeStyles()],
    [CODE_ASSETS.js, await codeScript()],
  ];

  return Object.fromEntries(
    contents.map(([name, text]) => {
      const file = fingerprinted(name, text);
      const dest = path.join(target, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, text, "utf-8");

      return [name, `/${file}`];
    })
  );
}

/**
 * Cloudflare Pages が読むヘッダ設定。**マニフェストから機械的に起こす。**
 *
 * 指紋付きの URL だけを恒久キャッシュにする。名前に内容が入っているため、
 * 中身が変われば別の URL になり、古いものが返り続けることが起きない。
 * ワイルドカードで書くと出力とずれうるので、実際に出した URL だけを並べる
 * （サイトマップをルートテーブルから起こすのと同じ理由）
 */
export function buildHeaders(manifest: AssetManifest): string {
  return Object.values(manifest)
    .map((url) => `${url}\n  Cache-Control: public, max-age=31536000, immutable\n`)
    .join("\n");
}

/** 複製する 1 件。to は out/ 直下からの相対パス */
export type CopyTarget = { from: string; to: string; filter?: (from: string) => boolean };

/**
 * `out/` へ複製する対象。
 *
 * CSS と JS はここに無い。指紋を付けて書き出す（writeAssets）ため、
 * **原本をそのまま置くと指紋の無い URL でも取れてしまい、恒久キャッシュが嘘になる**。
 * フォントは CSS からの相対参照であり、指紋を付けると参照が壊れるので複製のまま
 */
const assets: CopyTarget[] = [
  { from: publicDir, to: "." },
  {
    from: path.join(katex.dir, "fonts"),
    to: "katex/fonts",
    filter: (from) => fs.statSync(from).isDirectory() || from.endsWith(".woff2"),
  },
];

/**
 * コンテンツに同梱された画像の複製元を列挙する。
 * 配置と参照 URL の対応は features/image/assets.ts が決める。
 */
export function imageSources({ articles, artworks }: Content): ImageSource[] {
  return [
    ...articles.map((article) => ({
      kind: "articles" as const,
      id: article.slug,
      dir: path.join(contentDir, "articles", path.dirname(article.file)),
    })),
    ...artworks.map((artwork) => ({
      kind: "artworks" as const,
      id: artwork.id,
      dir: path.join(contentDir, "artworks", artwork.id),
    })),
  ];
}

/**
 * `public/` にあるがコンテンツと同じく最適化したい画像。
 *
 * サイトのアイコンはほとんどのページに出るうえ、原寸は 720x720 の PNG（342 KB）。
 * 原寸は OGP の共通画像とフォールバックに要るので、複製はそのまま残す
 */
export function siteImages(): ImageAsset[] {
  return [{ from: path.join(publicDir, "omemoji.png"), to: "omemoji.png", url: "/omemoji.png" }];
}

/** 最適化の対象。コンテンツに同梱された画像 + サイト共通の画像 */
export function imageAssets(content: Content): ImageAsset[] {
  return [...collectImages(imageSources(content)), ...siteImages()];
}

/**
 * OGP 画像を持たせるページ。
 *
 * 作品は作品画像を額装し、記事は satori でタイトルを描く。一覧とトップは
 * サイト共通の画像（720x720）へ倒す。
 *
 * **記事の画像は Twitter Card にしか出さない。**`og:image` を読む通常のリンクカードは
 * 記事も共通の画像を使う（layouts/Layout.tsx）
 */
export function ogSources({ articles, artworks }: Content): OgSource[] {
  return [
    ...artworks.map<OgSource>((artwork) => ({
      kind: "artwork",
      path: `/artworks/${artwork.id}`,
      from: path.join(contentDir, "artworks", artwork.id, artwork.src),
    })),
    ...articles.map<OgSource>((article) => ({
      kind: "article",
      path: `/articles/${article.slug}`,
      title: article.title,
    })),
  ];
}

/**
 * Markdown として描画される本文を全て並べる。リンクカードの URL 収集の入力。
 *
 * **描画するページを足したらここにも足すこと。**漏れるとカードにならず素のリンクになる
 * （About の本文が漏れていて、Spotify のリンクがカードにならなかった）。
 * 作品は meta.json だけで本文を持たない。
 */
export function markdownBodies({ articles, about }: Content): string[] {
  return [...articles.map((article) => article.body), about];
}

/**
 * コンテンツを読み込む。下書きの扱いはここで決める。
 *
 * 本番は published: false を落とし、dev は書きかけを確認できるよう残す。
 * 作品に下書きの概念は無いため、絞り込むのは記事だけ。
 */
export function loadContent({ includeDrafts }: { includeDrafts: boolean }): Content {
  const articles = loadArticles(path.join(contentDir, "articles"));

  return {
    articles: includeDrafts ? articles : articles.filter((article) => article.published),
    artworks: loadArtworks(path.join(contentDir, "artworks")),
    about: loadAbout(path.join(contentDir, "about")),
  };
}

/**
 * サイトマップに載せるページ。**収録の判断はルート側の `indexable` だけを見る。**
 *
 * タグ別・ページネーション 2 ページ目以降・404 はここで落ちる（同じ記事が
 * 複数の URL から辿れる状態を検索エンジンに見せないため）。
 * 更新日は詳細ページだけが持つ。一覧の更新日は「どの記事が載っているか」で
 * 変わってしまい、ページ自体の更新を表さないので付けない。
 */
export function sitemapEntries(routes: Route[]): SitemapEntry[] {
  return routes
    .filter((route) => route.indexable)
    .map((route) => {
      const lastmod =
        route.page === "ArticlePage"
          ? route.props.article.date
          : route.page === "ArtworkPage"
            ? route.props.artwork.date
            : undefined;

      return { path: route.path, ...(lastmod ? { lastmod } : {}) };
    });
}

/**
 * ルートのパスを出力先の相対パスに移す。build.format: "file" 相当。
 * `/` → `index.html`、`/articles/2` → `articles/2.html`
 */
export const outputPath = (routePath: string): string =>
  routePath === "/" ? "index.html" : `${routePath.replace(/^\//, "")}.html`;

/** 未実装のページは undefined を返す */
export async function renderRoute(route: Route): Promise<string | undefined> {
  // page と props は Route の中で対応済み。pages の値型も同じ対応を持つため安全
  const Page = pages[route.page] as
    | ((props: unknown) => ReactNode | Promise<ReactNode>)
    | undefined;
  if (!Page) {
    return undefined;
  }
  // 先に要素を確定させる。renderToStaticMarkup は Promise を含む木を描けない
  const element = await Page(route.props);
  return `<!doctype html>${renderToStaticMarkup(element)}`;
}

/**
 * 複製元が実在するものだけを写す。複製した to を返す。
 *
 * 無いものは黙って飛ばす。node_modules を入れ替えている最中の katex のように、
 * 1 件欠けただけでビルド全体が落ちる方が困る
 */
export function copyFiles(target: string, targets: CopyTarget[]): string[] {
  return targets.flatMap(({ from, to, filter }) => {
    if (!fs.existsSync(from)) {
      return [];
    }
    const dest = path.join(target, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(from, dest, { recursive: true, ...(filter ? { filter } : {}) });
    return [to];
  });
}

/** globals.css・public/・コンテンツの画像を出力先へ複製する */
export function copyAssets(target: string, content: Content): string[] {
  return copyFiles(target, [...assets, ...collectImages(imageSources(content))]);
}

/** 描画の結果。skipped は実装されていないページ（renderRoute が undefined を返したもの） */
export type RenderResult = { written: string[]; skipped: Route["page"][] };

/** 全ページを描いて書き出す。求められた大きさが足りなければ、呼び出し側が作って呼び直す */
export async function renderRoutes(target: string, routes: Route[]): Promise<RenderResult> {
  const written: string[] = [];
  const skipped: Route["page"][] = [];

  for (const route of routes) {
    const html = await renderRoute(route);
    if (html === undefined) {
      skipped.push(route.page);
      continue;
    }
    const file = path.join(target, outputPath(route.path));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html, "utf-8");
    written.push(outputPath(route.path));
  }

  return { written, skipped };
}

/** ビルド 1 回の結果。CLI の表示（reportBuild）もこれだけを見る */
export type BuildResult = RenderResult & {
  images: OptimizeResult;
  links: CollectResult;
  og: GenerateResult;
  /** 論理名 → 指紋付きの URL。名前が内容で決まるため、外から知るにはこれが要る */
  assets: AssetManifest;
};

/** 出力先を差し替えられるようにしてある。テストが実際の out/ を壊さずに検証するため */
export async function build(
  target: string = outDir,
  {
    cacheDir = imageCacheDir,
    offline = false,
  }: {
    cacheDir?: string;
    /** ネットワークを使わない。テストはこちら。リンクカードはキャッシュにある分だけ出る */
    offline?: boolean;
  } = {}
): Promise<BuildResult> {
  const content = loadContent({ includeDrafts: false });
  const routes = buildRoutes(content);

  // 消えたページの残骸を残さないため作り直す
  fs.rmSync(target, { recursive: true, force: true });
  copyAssets(target, content);
  // 描画より前。Layout が assetUrl で指紋付きの URL を引く
  const manifest = await writeAssets(target);
  setAssetManifest(manifest);
  fs.writeFileSync(path.join(target, "_headers"), buildHeaders(manifest), "utf-8");

  // 前回の描画で求められた大きさから始める。これがあると 1 回の描画で済む
  const assets = imageAssets(content);
  let images = await optimizeImages(assets, readWants(cacheDir), { outDir: target, cacheDir });
  setImageManifest(images.manifest);

  // 同じく描画より前。取得できなかった URL は素のリンクとして描画される
  const links = await collectLinkCards(collectAllLinkCardUrls(markdownBodies(content)), {
    cacheFile: linkCacheFile,
    cacheDir: linkCacheDir,
    outDir: target,
    offline,
  });
  setLinkCardManifest(links.manifest);

  // これも描画より前。持たないページは Layout が共通の画像へ倒す
  const og = await generateOgImages(ogSources(content), { outDir: target, cacheDir: ogCacheDir });
  setOgManifest(og.manifest);

  // ルートから機械的に起こす。ページの出力とずれることが無い
  fs.writeFileSync(
    path.join(target, "sitemap.xml"),
    buildSitemap(sitemapEntries(routes), HOST),
    "utf-8"
  );

  let { written, skipped } = await renderRoutes(target, routes);

  // 描画が求めた大きさのうち、まだ無かったもの。**どの大きさを作るかはここで決まる**
  const wants = takeImageWants();

  if (wants.length > 0) {
    // 作ってから描き直す。2 度目が要るのは新しい大きさが現れたときだけで、
    // 求められた大きさを覚えているため次のビルドでは起きない
    const all = [...readWants(cacheDir), ...wants];
    images = await optimizeImages(assets, all, { outDir: target, cacheDir });
    setImageManifest(images.manifest);
    writeWants(cacheDir, all);

    ({ written, skipped } = await renderRoutes(target, routes));
    // 2 度目の描画でも記録は溜まる（svg など変換できないもの）。持ち越さない
    takeImageWants();
  }

  return { written, skipped, images, links, og, assets: manifest };
}

/** CLI の表示。ビルドの結果だけを見て組み立てる（副作用は console だけ） */
export function reportBuild({ written, skipped, images, links, og }: BuildResult): void {
  console.log(`built ${written.length} pages -> ${path.relative(process.cwd(), outDir)}/`);
  console.log(
    `images: ${images.converted} converted, ${images.cached} cached, ${images.passthrough} as-is`
  );
  console.log(`link cards: ${links.fetched} fetched, ${links.cached} cached`);
  console.log(`og images: ${og.generated} generated, ${og.cached} cached`);

  if (links.failed.length > 0) {
    // カードにならないだけでページは出る。素のリンクとして描画されている
    console.log(
      `link cards not resolved (rendered as plain links):\n  ${links.failed.join("\n  ")}`
    );
  }

  if (skipped.length > 0) {
    const counts = new Map<string, number>();
    for (const page of skipped) {
      counts.set(page, (counts.get(page) ?? 0) + 1);
    }
    const summary = [...counts].map(([page, count]) => `${page}(${count})`).join(" ");
    console.log(`skipped ${skipped.length} routes for unimplemented pages: ${summary}`);
  }
}

if (import.meta.main) reportBuild(await build());
