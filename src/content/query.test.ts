import { describe, expect, test } from "bun:test";

import { collectTags, filterByTag, sortByDate } from "@/content/query";

/**
 * 記事も作品も満たす最小の形。query は id やタイトルを見ない。
 *
 * タグ名に TAGS の実在する値を使わないのは、query が TAGS を参照しないため。
 * 実在の値を借りると、TAGS からの削除でこの単体テストが巻き添えで落ちる。
 */
const content = (id: string, tags: string[]) => ({ id, tags });

describe("filterByTag", () => {
  const contents = [
    content("a", ["alpha", "beta"]),
    content("b", ["gamma"]),
    content("c", ["beta"]),
    content("d", []),
  ];

  test("そのタグを持つ要素だけを、元の順序のまま返す", () => {
    expect(filterByTag(contents, "beta").map((c) => c.id)).toEqual(["a", "c"]);
  });

  test("複数のタグを持つ要素は、どのタグからでも拾える", () => {
    expect(filterByTag(contents, "alpha").map((c) => c.id)).toEqual(["a"]);
  });

  test("該当が無ければ空配列を返す", () => {
    expect(filterByTag(contents, "delta")).toEqual([]);
  });

  test("部分一致では拾わない", () => {
    // includes は配列の要素比較であり、文字列の部分一致ではない
    expect(filterByTag(contents, "bet")).toEqual([]);
  });

  test("元の配列を破壊しない", () => {
    const original = [...contents];
    filterByTag(contents, "beta");

    expect(contents).toEqual(original);
  });
});

describe("collectTags", () => {
  test("重複を畳んで初出順に返す", () => {
    const contents = [
      content("a", ["beta", "alpha"]),
      content("b", ["alpha", "gamma"]),
      content("c", ["beta"]),
    ];

    expect(collectTags(contents)).toEqual(["beta", "alpha", "gamma"]);
  });

  test("タグを持たない要素は何も足さない", () => {
    expect(collectTags([content("a", []), content("b", ["alpha"])])).toEqual(["alpha"]);
  });

  test("空の入力には空配列を返す", () => {
    expect(collectTags([])).toEqual([]);
  });
});

describe("sortByDate", () => {
  const dated = (id: string, date: string) => ({ id, date: new Date(date) });

  test("日付の降順に並べる", () => {
    const contents = [dated("old", "2024-01-01"), dated("new", "2026-01-01")];

    expect(sortByDate(contents).map((c) => c.id)).toEqual(["new", "old"]);
  });

  test("日付が同じ要素は元の順序を保つ", () => {
    // artworks の id 順タイブレークは、この安定性の上に成り立っている
    const same = "2025-05-05";
    const contents = [dated("a", same), dated("b", same), dated("c", same)];

    expect(sortByDate(contents).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  test("元の配列を破壊しない", () => {
    // sort は破壊的なため、複製してから並べ替えている
    const contents = [dated("old", "2024-01-01"), dated("new", "2026-01-01")];
    const original = [...contents];

    expect(sortByDate(contents)).not.toBe(contents);
    expect(contents).toEqual(original);
  });

  test("空の入力には空配列を返す", () => {
    expect(sortByDate([])).toEqual([]);
  });
});
