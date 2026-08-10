import { ARTWORKS_PER_PAGE, COUNT_PER_PAGE } from "@/config";
import type { Article } from "@/content/articles";
import type { Artwork } from "@/content/artworks";
import { pageCount, pageIdGen, paginate } from "@/content/paginate";
import { collectTags, filterByTag } from "@/content/query";

/** 一覧ページ（タグ別・ページネーション込み）が受け取る props */
type ListProps<T> = {
  items: T[];
  /** 1 始まり */
  page: number;
  pageCount: number;
  /** タグで絞り込んでいる場合のみ持つ */
  tag?: string;
};

type PageProps = {
  About: undefined;
  ArticlesList: ListProps<Article>;
  ArtworksList: ListProps<Artwork>;
  ArticlePage: { article: Article };
  ArtworkPage: { artwork: Artwork };
};

type Route = {
  [P in keyof PageProps]: { path: string; page: P } & (PageProps[P] extends undefined
    ? { props?: undefined }
    : { props: PageProps[P] });
}[keyof PageProps];

export type Content = {
  articles: Article[];
  artworks: Artwork[];
};

/**
 * 1 つの一覧を perPage 件ずつのページ群に割る。
 * 1 ページ目は基点の URL そのままとし、2 ページ目以降に番号を付ける（旧実装の URL を維持する）。
 * page 名は呼び出し側で付けるため、ここでは path と props だけを返す。
 */
const paginateRoutes = <T>(
  basePath: string,
  items: T[],
  perPage: number,
  tag?: string
): { path: string; props: ListProps<T> }[] => {
  // 0 件でも一覧そのものは存在させる
  const count = Math.max(1, pageCount(items, perPage));

  return pageIdGen(count).map((page) => ({
    path: page === 1 ? basePath : `${basePath}/${page}`,
    props: {
      items: paginate(items, perPage, page),
      page,
      pageCount: count,
      ...(tag ? { tag } : {}),
    },
  }));
};

/**
 * コンテンツからルートテーブルを組み立てる。
 *
 * 読み込みは呼び出し側（build.ts / dev.ts）の責務とし、ここでは I/O を行わない。
 * dev はファイル変更時に読み直して呼び直すだけで済み、テストは合成データを渡せる。
 */
export function buildRoutes({ articles, artworks }: Content): Route[] {
  const artworksListRoutes: Route[] = [
    ...paginateRoutes("/artworks", artworks, ARTWORKS_PER_PAGE),
    // タグは実データから集める。TAGS を使うと記事専用タグの空ページが生まれる
    ...collectTags(artworks).flatMap((tag) =>
      paginateRoutes(`/artworks/tag/${tag}`, filterByTag(artworks, tag), ARTWORKS_PER_PAGE, tag)
    ),
  ].map(({ path, props }) => ({ path, page: "ArtworksList", props }));

  const articlesListRoutes: Route[] = [
    ...paginateRoutes("/articles", articles, COUNT_PER_PAGE),
    ...collectTags(articles).flatMap((tag) =>
      paginateRoutes(`/articles/tag/${tag}`, filterByTag(articles, tag), COUNT_PER_PAGE, tag)
    ),
  ].map(({ path, props }) => ({ path, page: "ArticlesList", props }));

  const artworkRoutes: Route[] = artworks.map((artwork) => ({
    path: `/artworks/${artwork.id}`,
    page: "ArtworkPage",
    props: { artwork },
  }));

  const articleRoutes: Route[] = articles.map((article) => ({
    path: `/articles/${article.slug}`,
    page: "ArticlePage",
    props: { article },
  }));

  return [
    { path: "/", page: "About" },
    // 作品
    ...artworksListRoutes,
    ...artworkRoutes,
    // 記事
    ...articlesListRoutes,
    ...articleRoutes,
  ];
}
