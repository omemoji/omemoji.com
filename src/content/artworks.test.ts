import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { loadArtworks } from "@/content/artworks";

const baseDir = path.join(import.meta.dirname, "../../content/artworks");
const artworks = loadArtworks(baseDir);

test(`全ての作品がスキーマを通る（${artworks.length} 件）`, () => {
  expect(artworks.length).toBeGreaterThan(0);
});

test("id がサイト全体で一意である", () => {
  const ids = artworks.map((artwork) => artwork.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("id の昇順に並んでいる", () => {
  const ids = artworks.map((artwork) => artwork.id);
  expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
});

test("全ての作品の src が実在する", () => {
  // スキーマは文字列であることしか見ないため、ファイルの有無はここで検査する
  const missing = artworks
    .map((artwork) => path.join(baseDir, artwork.id, artwork.src))
    .filter((file) => !fs.existsSync(file));

  expect(missing).toEqual([]);
});
