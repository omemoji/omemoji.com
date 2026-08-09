import { expect, test } from "bun:test";
import path from "node:path";

import { loadArtworks } from "@/content/artworks";

const artworks = loadArtworks(path.join(import.meta.dirname, "../../content/artworks"));

test("作品を1件以上ロードする", () => {
  expect(artworks.length).toBeGreaterThan(0);
});

test("先頭と末尾は異なる作品である", () => {
  expect(artworks.length).toBeGreaterThan(1);
  expect(artworks[0]?.id).not.toBe(artworks.at(-1)?.id);
});

test.each([
  ["先頭", artworks[0]],
  ["末尾", artworks.at(-1)],
])("%s の作品が必須フィールドを持つ", (_position, artwork) => {
  expect(artwork).toMatchObject({
    id: expect.any(String),
    title: expect.any(String),
    date: expect.any(String),
    src: expect.any(String),
    tags: expect.any(Array),
  });
});
