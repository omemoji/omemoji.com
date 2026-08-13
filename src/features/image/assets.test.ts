import { expect, test } from "bun:test";
import type { Element, Root } from "hast";

import { imageBase, imageDir, isImage, rewriteImageUrls } from "@/features/image/assets";

const img = (src: string): Root => ({
  type: "root",
  children: [{ type: "element", tagName: "img", properties: { src }, children: [] }],
});

const srcOf = (tree: Root): unknown => {
  // 添字アクセスは biome、ドットアクセスは tsc に触れるため分割代入で受ける
  const { src } = (tree.children[0] as Element).properties;
  return src;
};

test("参照 URL と出力先が対応する", () => {
  expect(imageBase("articles", "void_linux")).toBe("/images/articles/void_linux");
  expect(imageDir("articles", "void_linux")).toBe("images/articles/void_linux");
  expect(imageBase("artworks", "eagle")).toBe("/images/artworks/eagle");
});

test("記事ごとに名前空間が分かれる", () => {
  // 同名の画像が複数の記事にある（fastfetch.png）ため、平置きにはできない
  expect(imageBase("articles", "kindle_on_linux")).not.toBe(
    imageBase("articles", "asahi_linux_install")
  );
});

test.each([
  ["a.png", true],
  ["a.JPG", true],
  ["a.jpeg", true],
  ["a.svg", true],
  ["a.md", false],
  ["meta.json", false],
])("%s を画像と判定するか: %p", (file, expected) => {
  expect(isImage(file)).toBe(expected);
});

test.each([
  ["fastfetch.png", "/images/articles/x/fastfetch.png"],
  ["./fastfetch.png", "/images/articles/x/fastfetch.png"],
  ["../fastfetch.png", "/images/articles/x/fastfetch.png"],
])("相対参照 %s を配信 URL へ書き換える", (src, expected) => {
  expect(srcOf(rewriteImageUrls(img(src), "/images/articles/x"))).toBe(expected);
});

test.each([
  "https://example.com/a.png",
  "//example.com/a.png",
  "/images/articles/y/a.png",
  "data:image/png;base64,AAAA",
])("既に絶対な参照 %s は書き換えない", (src) => {
  expect(srcOf(rewriteImageUrls(img(src), "/images/articles/x"))).toBe(src);
});
