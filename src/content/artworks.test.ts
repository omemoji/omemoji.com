import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { loadArtworks } from "@/content/artworks";

const baseDir = path.join(import.meta.dirname, "../../content/artworks");
const artworks = loadArtworks(baseDir);

// 落ちたら作品データを直す
describe("実データ（content/artworks）", () => {
  test(`全ての作品がスキーマを通る（${artworks.length} 件）`, () => {
    expect(artworks.length).toBeGreaterThan(0);
  });

  test("id がサイト全体で一意である", () => {
    const ids = artworks.map((artwork) => artwork.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("日付の降順に並んでいる", () => {
    const dates = artworks.map((artwork) => artwork.date.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  test("日付が同じ作品は id の昇順に並ぶ", () => {
    // readdirSync の順序に依存せず、並びが再現することを保証する
    const unordered = artworks.filter((artwork, index) => {
      const previous = artworks[index - 1];
      return previous?.date.getTime() === artwork.date.getTime() && previous.id > artwork.id;
    });

    expect(unordered.map((artwork) => artwork.id)).toEqual([]);
  });

  test("全ての作品の src が実在する", () => {
    // スキーマは文字列であることしか見ないため、ファイルの有無はここで検査する
    const missing = artworks
      .map((artwork) => path.join(baseDir, artwork.id, artwork.src))
      .filter((file) => !fs.existsSync(file));

    expect(missing).toEqual([]);
  });
});
