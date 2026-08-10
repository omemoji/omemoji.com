import { describe, expect, test } from "bun:test";

import { ARTWORKS_PER_PAGE } from "@/config";
import type { Artwork } from "@/content/artworks";
import { buildRoutes } from "@/routes";
import { articles, artworks } from "@/tests/content";

const routes = buildRoutes({ articles, artworks });

const listRoutes = routes.filter(
  (route) => route.page === "ArticlesList" || route.page === "ArtworksList"
);

/** 同じ一覧に属するページ群を、基点の URL ごとにまとめてページ番号順に並べる */
const listGroups = Object.entries(
  // 2 ページ目以降は末尾の番号を落として基点に揃える
  Object.groupBy(listRoutes, (route) => route.path.replace(/\/\d+$/, ""))
).map(([basePath, group = []]) => ({
  basePath,
  pages: [...group].sort((a, b) => a.props.page - b.props.page),
}));

const duplicatesOf = (paths: string[]): string[] =>
  paths.filter((p, index) => paths.indexOf(p) !== index);

describe("実データ", () => {
  test(`パスが重複しない（全 ${routes.length} ルート）`, () => {
    // /artworks/<ページ番号> と /artworks/<id> は名前空間を共有している。
    // 現に id が 2022 / 2023 の作品があり、衝突しても型では防げない
    expect(duplicatesOf(routes.map((route) => route.path))).toEqual([]);
  });

  test(`一覧のページ番号が 1 からの連番である（${listGroups.length} 一覧）`, () => {
    const broken = listGroups
      .map(({ basePath, pages }) => ({
        basePath,
        actual: pages.map((route) => route.props.page),
        expected: pages.map((_, index) => index + 1),
      }))
      .filter(({ actual, expected }) => actual.join() !== expected.join());

    expect(broken).toEqual([]);
  });

  test("全ページの pageCount が実際のページ数と一致する", () => {
    // ページ番号リンクを全ページで同じ列にするため、値が揺れてはいけない
    const broken = listGroups
      .map(({ basePath, pages }) => ({
        basePath,
        declared: [...new Set(pages.map((route) => route.props.pageCount))],
        actual: pages.length,
      }))
      .filter(({ declared, actual }) => declared.length !== 1 || declared[0] !== actual);

    expect(broken).toEqual([]);
  });

  test("1 ページ目は基点の URL、2 ページ目以降は基点 + ページ番号である", () => {
    // 旧実装の URL を維持するための分岐。/articles/1 のような形は作らない
    const broken = listGroups.flatMap(({ basePath, pages }) =>
      pages
        .map((route) => ({
          actual: route.path,
          expected: route.props.page === 1 ? basePath : `${basePath}/${route.props.page}`,
        }))
        .filter(({ actual, expected }) => actual !== expected)
    );

    expect(broken).toEqual([]);
  });

  test("全ての一覧ページの items が空でない", () => {
    // タグ別一覧を TAGS から生成すると記事専用タグの空ページが並ぶため、その退行を捕まえる
    const empty = listRoutes.filter((route) => route.props.items.length === 0);

    expect(empty.map((route) => route.path)).toEqual([]);
  });

  test("一覧を連結すると全件がちょうど 1 回ずつ現れる", () => {
    const joined = listGroups
      .filter(({ basePath }) => basePath === "/artworks" || basePath === "/articles")
      .map(({ basePath, pages }) => ({
        basePath,
        items: pages.flatMap<unknown>((route) => route.props.items),
        total: basePath === "/artworks" ? artworks.length : articles.length,
      }))
      .map(({ basePath, items, total }) => ({
        basePath,
        count: items.length,
        unique: new Set(items).size,
        total,
      }))
      .filter(({ count, unique, total }) => count !== total || unique !== total);

    expect(joined).toEqual([]);
  });

  test("タグ別一覧だけが props.tag を持ち、URL のタグと一致する", () => {
    const broken = listRoutes.filter(({ path: p, props }) =>
      props.tag === undefined ? p.includes("/tag/") : !p.includes(`/tag/${props.tag}`)
    );

    expect(broken.map((route) => route.path)).toEqual([]);
  });

  test("トップページはサイトマップに載る", () => {
    expect(routes.find((route) => route.path === "/")?.indexable).toBe(true);
  });

  test("サイトマップに載せるのは詳細ページと一覧の 1 ページ目だけ", () => {
    // 同じ記事が複数の URL から辿れるため、絞り込みと 2 ページ目以降は除く。
    // パス末尾の数字では判定できない（artwork.idが数字になるケースを許容しているため）
    const wrong = routes.filter((route) => {
      const expected =
        route.page === "ArticlesList" || route.page === "ArtworksList"
          ? route.props.page === 1 && route.props.tag === undefined
          : true;

      return route.indexable !== expected;
    });

    expect(wrong.map((route) => route.path)).toEqual([]);
  });

  test(`全ての作品にちょうど 1 つの詳細ページがある（${artworks.length} 件）`, () => {
    const paths = routes.filter((route) => route.page === "ArtworkPage").map((route) => route.path);

    expect(paths.toSorted()).toEqual(
      artworks.map((artwork) => `/artworks/${artwork.id}`).toSorted()
    );
  });

  test(`全ての記事にちょうど 1 つの詳細ページがある（${articles.length} 件）`, () => {
    const paths = routes.filter((route) => route.page === "ArticlePage").map((route) => route.path);

    expect(paths.toSorted()).toEqual(
      articles.map((article) => `/articles/${article.slug}`).toSorted()
    );
  });
});

describe("合成データ", () => {
  const artwork = (id: string, date: string): Artwork => ({
    id,
    title: id,
    date: new Date(date),
    src: `${id}.png`,
    tags: ["Illustration"],
  });

  test("ページ番号と衝突する id を重複検査が捕まえる", () => {
    const artworks = [...Array(ARTWORKS_PER_PAGE + 1)].map((_, index) =>
      // id が "2" の作品は、2 ページ目の URL と同じ /artworks/2 になる
      artwork(index === 0 ? "2" : `artwork-${index}`, "2026-01-01")
    );
    const paths = buildRoutes({ articles: [], artworks }).map((route) => route.path);

    expect(duplicatesOf(paths)).toEqual(["/artworks/2"]);
  });

  test("コンテンツが空でも一覧ページは存在する", () => {
    const paths = buildRoutes({ articles: [], artworks: [] }).map((route) => route.path);

    expect(paths).toEqual(["/", "/artworks", "/articles"]);
  });
});
