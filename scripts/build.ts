import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadAbout } from "@/content/about";
import { loadArticles } from "@/content/articles";
import { loadArtworks } from "@/content/artworks";
import { collectImages, type ImageSource } from "@/features/image/assets";
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
  target: string = outDir
): Promise<{ written: string[]; skipped: Route["page"][] }> {
  const content = loadContent({ includeDrafts: false });
  const routes = buildRoutes(content);

  // 消えたページの残骸を残さないため作り直す
  fs.rmSync(target, { recursive: true, force: true });
  copyAssets(target, content);

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

if (import.meta.main) {
  const { written, skipped } = await build();
  console.log(`built ${written.length} pages -> ${path.relative(process.cwd(), outDir)}/`);

  if (skipped.length > 0) {
    const counts = new Map<string, number>();
    for (const page of skipped) {
      counts.set(page, (counts.get(page) ?? 0) + 1);
    }
    const summary = [...counts].map(([page, count]) => `${page}(${count})`).join(" ");
    console.log(`skipped ${skipped.length} routes for unimplemented pages: ${summary}`);
  }
}
