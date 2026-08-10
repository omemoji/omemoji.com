import { expect, test } from "bun:test";
import path from "node:path";

import { loadArticles } from "@/content/articles";
import { loadArtworks } from "@/content/artworks";
import { routes } from "@/routes";

const artworks = loadArtworks(path.join(import.meta.dirname, "../content/artworks"));
const articles = loadArticles(path.join(import.meta.dirname, "../content/articles"));

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

test(`パスが重複しない（全 ${routes.length} ルート）`, () => {
  // /artworks/<ページ番号> と /artworks/<id> は名前空間を共有している。
  // 現に id が 2022 / 2023 の作品があり、衝突しても型では防げない
  const paths = routes.map((route) => route.path);
  const duplicated = paths.filter((p, index) => paths.indexOf(p) !== index);

  expect(duplicated).toEqual([]);
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

test(`全ての作品にちょうど 1 つの詳細ページがある（${artworks.length} 件）`, () => {
  const paths = routes.filter((route) => route.page === "ArtworkPage").map((route) => route.path);

  expect(paths.toSorted()).toEqual(artworks.map((artwork) => `/artworks/${artwork.id}`).toSorted());
});

test(`全ての記事にちょうど 1 つの詳細ページがある（${articles.length} 件）`, () => {
  const paths = routes.filter((route) => route.page === "ArticlePage").map((route) => route.path);

  expect(paths.toSorted()).toEqual(
    articles.map((article) => `/articles/${article.slug}`).toSorted()
  );
});
