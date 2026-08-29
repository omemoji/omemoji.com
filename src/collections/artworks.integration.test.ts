import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { artworks, artworksDir as baseDir } from "@/tests/content";

// 落ちたら作品データを直す
describe("実データ（content/artworks）", () => {
  test("作品が 1 件以上ある", () => {
    expect(artworks.length).toBeGreaterThan(0);
  });

  test("id がサイト全体で一意である", () => {
    const ids = artworks.map((artwork) => artwork.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("全ての作品の src が実在する", () => {
    // スキーマは文字列であることしか見ないため、ファイルの有無はここで検査する
    const missing = artworks
      .map((artwork) => path.join(baseDir, artwork.id, artwork.src))
      .filter((file) => !fs.existsSync(file));

    expect(missing).toEqual([]);
  });
});
