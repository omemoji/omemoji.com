import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import { generateOgImages, OG_PARAMS, ogUrl } from "@/features/og/generate";

describe("配信 URL", () => {
  test.each([
    ["/artworks/ink_drop", "/images/og/artworks/ink_drop.png"],
    // 日本語 ID でも URL として壊れない
    ["/artworks/ゆき", "/images/og/artworks/%E3%82%86%E3%81%8D.png"],
  ])("%s → %s", (pagePath, expected) => {
    expect(ogUrl(pagePath)).toBe(expected);
  });
});

describe("生成", () => {
  let dir = "";
  const outDir = () => path.join(dir, "out");
  const cacheDir = () => path.join(dir, "cache");
  const source = () => ({ path: "/artworks/x", from: path.join(dir, "x.png") });

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-og-"));
    // 縦長の作品。額装の余白が出る形を選ぶ
    await sharp({ create: { width: 600, height: 1200, channels: 3, background: "#123456" } })
      .png()
      .toFile(path.join(dir, "x.png"));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("1200x630 の PNG を出し、マニフェストに載せる", async () => {
    const { manifest, generated } = await generateOgImages([source()], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(generated).toBe(1);
    expect(manifest["/artworks/x"]).toEqual({
      src: "/images/og/artworks/x.png",
      width: 1200,
      height: 630,
    });

    const meta = await sharp(path.join(outDir(), "images/og/artworks/x.png")).metadata();
    expect([meta.width, meta.height]).toEqual([OG_PARAMS.width, OG_PARAMS.height]);
    expect(meta.format).toBe("png");
  });

  test("作品は切らずに収める", async () => {
    // contain なので中央に作品、左右に余白の色が出る。cover だと端が切れる
    const image = sharp(path.join(outDir(), "images/og/artworks/x.png"));
    const left = await image
      .clone()
      .extract({ left: 0, top: 300, width: 1, height: 1 })
      .raw()
      .toBuffer();
    const center = await image
      .extract({ left: OG_PARAMS.width / 2, top: 300, width: 1, height: 1 })
      .raw()
      .toBuffer();

    expect([left[0], left[1], left[2]]).toEqual([0x55, 0x55, 0x55]);
    expect([center[0], center[1], center[2]]).toEqual([0x12, 0x34, 0x56]);
  });

  test("2 回目は生成せずキャッシュから複製する", async () => {
    fs.rmSync(outDir(), { recursive: true, force: true });

    const { generated, cached } = await generateOgImages([source()], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(generated).toBe(0);
    expect(cached).toBe(1);
    expect(fs.existsSync(path.join(outDir(), "images/og/artworks/x.png"))).toBe(true);
  });
});
