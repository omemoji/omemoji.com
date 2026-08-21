import { afterEach, expect, test } from "bun:test";

import { clearOgManifest, resolveOg, setOgManifest } from "@/features/og/manifest";

const image = {
  src: "/images/og/artworks/x.png",
  width: 1200,
  height: 630,
  kind: "artwork",
} as const;

afterEach(() => {
  clearOgManifest();
});

test("ステージの出力をそのまま引ける", () => {
  setOgManifest({ "/artworks/x": image });

  expect(resolveOg("/artworks/x")).toEqual(image);
});

test("個別の画像を持たないページは undefined。呼び出し側が共通の画像へ倒す", () => {
  setOgManifest({ "/artworks/x": image });

  expect(resolveOg("/articles/y")).toBeUndefined();
});

test("import しただけでは空。dev は生成しないため常にこちら", () => {
  expect(resolveOg("/artworks/x")).toBeUndefined();
});
