import path from "node:path";

import { type Article, loadArticles } from "@/content/articles";
import type { Artwork } from "@/content/artworks";
import { loadArtworks } from "@/content/artworks";

type PageProps = {
  About: undefined;
  ArticlesList: undefined;
  ArtworksList: undefined;
  ArticlePage: { article: Article };
  ArtworkPage: { artwork: Artwork };
};

type Route = {
  [P in keyof PageProps]: { path: string; page: P } & (PageProps[P] extends undefined
    ? { props?: undefined }
    : { props: PageProps[P] });
}[keyof PageProps];

const artworksRoutes: Route[] = loadArtworks(
  path.join(import.meta.dirname, "../content/artworks")
).map((artwork) => ({
  path: `/artworks/${artwork.id}`,
  page: "ArtworkPage",
  props: { artwork },
}));

const articlesRoutes: Route[] = loadArticles(
  path.join(import.meta.dirname, "../content/articles")
).map((article) => ({
  path: `/articles/${article.slug}`,
  page: "ArticlePage",
  props: { article },
}));

export const routes: Route[] = [
  { path: "/", page: "About" },
  // 作品
  { path: "/artworks", page: "ArtworksList" },
  ...artworksRoutes,
  // 記事
  { path: "/articles", page: "ArticlesList" },
  ...articlesRoutes,
];
