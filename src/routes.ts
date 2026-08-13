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

export type PageProps = {
  /** about.md の本文。記事と違い 1 件しかないためスキーマを持たない */
  AboutPage: { body: string };
  NotFoundPage: undefined;
  ArticlesList: ListProps<Article>;
  ArtworksList: ListProps<Artwork>;
  ArticlePage: { article: Article };
  /** 一覧の帯（GalleryRow）が全作品を必要とするため、詳細でも全件を渡す */
  ArtworkPage: { artwork: Artwork; artworks: Artwork[] };
};

export type Route = {
  [P in keyof PageProps]: {
    path: string;
    /** サイトマップに載せるか。タグ別とページネーション 2 ページ目以降は false */
    indexable: boolean;
    page: P;
  } & (PageProps[P] extends undefined ? { props?: undefined } : { props: PageProps[P] });
}[keyof PageProps];

export type Content = {
  articles: Article[];
  artworks: Artwork[];
  /** about.md の本文 */
  about: string;
};

/**
 * 1 つの一覧を perPage 件ずつのページ群に割る。
 * 1 ページ目は基点の URL そのままとし、2 ページ目以降に番号を付ける（旧実装の URL を維持する）。
 * page 名は呼び出し側で付けるため、ここでは返さない。
 */
const paginateRoutes = <T>(
  basePath: string,
  items: T[],
  perPage: number,
  tag?: string
): { path: string; indexable: boolean; props: ListProps<T> }[] => {
  // 0 件でも一覧そのものは存在させる
  const count = Math.max(1, pageCount(items, perPage));

  return pageIdGen(count).map((page) => ({
    path: page === 1 ? basePath : `${basePath}/${page}`,
    // 同じ記事が複数の URL から辿れるため、絞り込みと 2 ページ目以降は載せない
    indexable: page === 1 && tag === undefined,
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
export function buildRoutes({ articles, artworks, about }: Content): Route[] {
  const artworksListRoutes: Route[] = [
    ...paginateRoutes("/artworks", artworks, ARTWORKS_PER_PAGE),
    // タグは実データから集める。TAGS を使うと記事専用タグの空ページが生まれる
    ...collectTags(artworks).flatMap((tag) =>
      paginateRoutes(`/artworks/tag/${tag}`, filterByTag(artworks, tag), ARTWORKS_PER_PAGE, tag)
    ),
  ].map(({ path, indexable, props }) => ({ path, indexable, page: "ArtworksList", props }));

  const articlesListRoutes: Route[] = [
    ...paginateRoutes("/articles", articles, COUNT_PER_PAGE),
    ...collectTags(articles).flatMap((tag) =>
      paginateRoutes(`/articles/tag/${tag}`, filterByTag(articles, tag), COUNT_PER_PAGE, tag)
    ),
  ].map(({ path, indexable, props }) => ({ path, indexable, page: "ArticlesList", props }));

  const artworkRoutes: Route[] = artworks.map((artwork) => ({
    path: `/artworks/${artwork.id}`,
    indexable: true,
    page: "ArtworkPage",
    props: { artwork, artworks },
  }));

  const articleRoutes: Route[] = articles.map((article) => ({
    path: `/articles/${article.slug}`,
    indexable: true,
    page: "ArticlePage",
    props: { article },
  }));

  return [
    { path: "/", indexable: true, page: "AboutPage", props: { body: about } },
    // 作品
    ...artworksListRoutes,
    ...artworkRoutes,
    // 記事
    ...articlesListRoutes,
    ...articleRoutes,
    // 404。Cloudflare Pages が out/404.html を拾う。サイトマップには載せない
    { path: "/404", indexable: false, page: "NotFoundPage" },
  ];
}
