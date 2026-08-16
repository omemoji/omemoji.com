import { describe, expect, test } from "bun:test";

import { ARTWORKS_PER_PAGE } from "@/config";
import type { Artwork } from "@/content/artworks";
import { TAGS } from "@/content/tags";
import { buildRoutes } from "@/routes";

// 実データを流したときの検査は routes.integration.test.ts にある
const about = "";

const duplicatesOf = (paths: string[]): string[] =>
  paths.filter((p, index) => paths.indexOf(p) !== index);

describe("合成データ", () => {
  const artwork = (id: string, date: string): Artwork => ({
    id,
    title: id,
    date: new Date(date),
    src: `${id}.png`,
    // 特定のタグ名を書くと、TAGS からの削除でこの単体テストが巻き添えで落ちる
    tags: [TAGS[0]],
  });

  test("ページ番号と衝突する id を重複検査が捕まえる", () => {
    const artworks = [...Array(ARTWORKS_PER_PAGE + 1)].map((_, index) =>
      // id が "2" の作品は、2 ページ目の URL と同じ /artworks/2 になる
      artwork(index === 0 ? "2" : `artwork-${index}`, "2026-01-01")
    );
    const paths = buildRoutes({ articles: [], artworks, about }).map((route) => route.path);

    expect(duplicatesOf(paths)).toEqual(["/artworks/2"]);
  });

  test("コンテンツが空でも一覧ページは存在する", () => {
    const paths = buildRoutes({ articles: [], artworks: [], about }).map((route) => route.path);

    expect(paths).toEqual(["/", "/artworks", "/articles", "/404"]);
  });
});
