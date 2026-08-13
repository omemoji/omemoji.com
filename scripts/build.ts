import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadAbout } from "@/content/about";
import { loadArticles } from "@/content/articles";
import { loadArtworks } from "@/content/artworks";
import { collectImages, type ImageSource, imageUrl } from "@/features/image/assets";
import { setImageManifest } from "@/features/image/manifest";
import {
  AVIF_PARAMS,
  CONTENT_VARIANT,
  type OptimizeResult,
  optimizeImages,
  THUMB_PARAMS,
  THUMB_VARIANT,
  type Variant,
} from "@/features/image/optimize";
import { type CollectResult, collectLinkCards } from "@/features/link-card/collect";
import { setLinkCardManifest } from "@/features/link-card/manifest";
import { collectAllLinkCardUrls } from "@/features/link-card/urls";
import { type GenerateResult, generateOgImages, type OgSource } from "@/features/og/generate";
import { setOgManifest } from "@/features/og/manifest";
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
  href: "globals.css",
};

/** `out/` へ複製する対象。to は out/ 直下からの相対パス */
const assets: { from: string; to: string }[] = [
  { from: publicDir, to: "." },
  { from: stylesheet.file, to: stylesheet.href },
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
 * 作る大きさの一覧。
 *
 * ギャラリー（一覧・帯）に並ぶのは作品の代表画像だけで、表示は本文幅の 1/3 しかない。
 * 本文用の大きさを送って CSS で切り抜くと、転送量のほとんどを捨てることになるため、
 * 切り抜き済みの小さいバリアントを別に作る。他の画像には作らない。
 */
export function imageVariants({ artworks }: Content): Variant[] {
  const gallery = new Set(artworks.map((artwork) => imageUrl("artworks", artwork.id, artwork.src)));

  return [
    { name: CONTENT_VARIANT, params: AVIF_PARAMS },
    { name: THUMB_VARIANT, params: THUMB_PARAMS, match: (asset) => gallery.has(asset.url) },
  ];
}

/**
 * OGP 画像を持たせるページ。
 *
 * **作品だけ**が個別の画像を持つ。記事と一覧はサイト共通の画像（720x720）へ倒す。
 * 記事は satori で文字を載せた画像を作っていたが、フォントとレイアウトエンジンを
 * 抱える割に得るものが小さいため、移植では作らないことにした。
 */
export function ogSources({ artworks }: Content): OgSource[] {
  return artworks.map((artwork) => ({
    path: `/artworks/${artwork.id}`,
    from: path.join(contentDir, "artworks", artwork.id, artwork.src),
  }));
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

/** globals.css・public/・コンテンツの画像を出力先へ複製する */
export function copyAssets(target: string, content: Content): string[] {
  const targets = [...assets, ...collectImages(imageSources(content))];

  return targets.flatMap(({ from, to }) => {
    if (!fs.existsSync(from)) {
      return [];
    }
    const dest = path.join(target, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(from, dest, { recursive: true });
    return [to];
  });
}

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
): Promise<{
  written: string[];
  skipped: Route["page"][];
  images: OptimizeResult;
  links: CollectResult;
  og: GenerateResult;
}> {
  const content = loadContent({ includeDrafts: false });
  const routes = buildRoutes(content);

  // 消えたページの残骸を残さないため作り直す
  fs.rmSync(target, { recursive: true, force: true });
  copyAssets(target, content);

  // 描画より先に済ませる。Image が寸法を引けるのはマニフェストを差し込んだ後
  const images = await optimizeImages(collectImages(imageSources(content)), {
    outDir: target,
    cacheDir,
    variants: imageVariants(content),
  });
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

  return { written, skipped, images, links, og };
}

if (import.meta.main) {
  const { written, skipped, images, links, og } = await build();
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
