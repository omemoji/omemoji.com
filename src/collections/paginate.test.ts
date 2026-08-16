import { describe, expect, test } from "bun:test";

import { pageCount, pageIdGen, paginate } from "@/collections/paginate";

describe("pageCount", () => {
  test.each([
    [0, 9, 0],
    [1, 9, 1],
    [9, 9, 1], // perPage ちょうど
    [10, 9, 2], // 1 件超過
    [18, 9, 2],
    [19, 9, 3],
  ])("%i 件を %i 件ずつに割ると %i ページ", (items, perPage, expected) => {
    expect(pageCount([...Array(items)], perPage)).toBe(expected);
  });
});

describe("pageIdGen", () => {
  test("1 から始まる連番を返す", () => {
    expect(pageIdGen(3)).toEqual([1, 2, 3]);
  });

  test("0 ページなら空配列を返す", () => {
    expect(pageIdGen(0)).toEqual([]);
  });
});

describe("paginate", () => {
  const items = [...Array(10)].map((_, i) => i);

  test.each([
    [1, [0, 1, 2, 3]],
    [2, [4, 5, 6, 7]],
    [3, [8, 9]], // 端数の最終ページ
  ])("%i ページ目を切り出す", (page, expected) => {
    expect(paginate(items, 4, page)).toEqual(expected);
  });

  test("範囲外のページは空配列を返す", () => {
    expect(paginate(items, 4, 4)).toEqual([]);
  });

  test("全ページを連結すると元の配列に一致する", () => {
    const perPage = 4;
    const joined = pageIdGen(pageCount(items, perPage)).flatMap((page) =>
      paginate(items, perPage, page)
    );

    expect(joined).toEqual(items);
  });

  test("元の配列を破壊しない", () => {
    const original = [...items];
    paginate(items, 4, 1);

    expect(items).toEqual(original);
  });
});
