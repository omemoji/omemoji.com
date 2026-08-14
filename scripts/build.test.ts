import { describe, expect, test } from "bun:test";

import { outputPath } from "./build";

// 実データを読み込む検査と、実際に書き出す検査は build.integration.test.ts にある
describe("出力先の対応", () => {
  test.each([
    ["/", "index.html"],
    ["/articles", "articles.html"],
    ["/articles/2", "articles/2.html"],
    ["/articles/fukui_travel", "articles/fukui_travel.html"],
    ["/artworks/tag/Dragon", "artworks/tag/Dragon.html"],
  ])("%s の出力先は %s", (routePath, expected) => {
    expect(outputPath(routePath)).toBe(expected);
  });
});
