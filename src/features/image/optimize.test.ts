import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import type { ImageAsset } from "@/features/image/assets";
import {
  AVIF_PARAMS,
  cacheKey,
  displaySize,
  measureImages,
  optimizeImages,
} from "@/features/image/optimize";

describe("表示サイズ", () => {
  test.each([
    // 横長は幅 700px に合わせる
    [1400, 700, { width: 700, height: 350 }],
    // 高さが 540px を超えるものは高さで律速する（幅は逆算）
    [700, 1400, { width: 270, height: 540 }],
    [1000, 1000, { width: 540, height: 540 }],
  ])("%i x %i → %o", (width, height, expected) => {
    expect(displaySize(width, height, AVIF_PARAMS)).toEqual(expected);
  });

  test("高さは上限を超えない", () => {
    const { height } = displaySize(100, 5000, AVIF_PARAMS);

    expect(height).toBe(AVIF_PARAMS.maxHeight);
  });
});

describe("キャッシュのキー", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  test("同じ入力・同じパラメータなら同じ", () => {
    expect(cacheKey(bytes, AVIF_PARAMS)).toBe(cacheKey(bytes, AVIF_PARAMS));
  });

  test("入力が違えば違う", () => {
    expect(cacheKey(bytes, AVIF_PARAMS)).not.toBe(cacheKey(new Uint8Array([1, 2, 4]), AVIF_PARAMS));
  });

  test("パラメータが違えば違う", () => {
    // ここが効かないと quality を変えても古い出力が残る
    expect(cacheKey(bytes, AVIF_PARAMS)).not.toBe(cacheKey(bytes, { ...AVIF_PARAMS, quality: 50 }));
  });
});

describe("変換", () => {
  let dir = "";
  let assets: ImageAsset[] = [];

  const outDir = () => path.join(dir, "out");
  const cacheDir = () => path.join(dir, "cache");

  /** 単色の PNG を作る。実データを使わずに変換の性質だけを見る */
  const png = async (name: string, width: number, height: number): Promise<ImageAsset> => {
    const from = path.join(dir, name);
    await sharp({
      create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toFile(from);

    return { from, to: path.join("images/articles/x", name), url: `/images/articles/x/${name}` };
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-"));
    assets = [await png("wide.png", 1400, 700), await png("tall.png", 700, 1400)];
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("AVIF を出力し、出力された寸法をマニフェストに載せる", async () => {
    const { manifest, converted } = await optimizeImages(assets, {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(converted).toBe(2);
    expect(manifest["/images/articles/x/wide.png"]).toEqual({
      src: "/images/articles/x/wide.avif",
      width: 700,
      height: 350,
    });
    expect(fs.existsSync(path.join(outDir(), "images/articles/x/wide.avif"))).toBe(true);

    const meta = await sharp(path.join(outDir(), "images/articles/x/tall.avif")).metadata();
    expect(meta.format).toBe("heif");
    expect(meta.height).toBe(540);
  });

  test("2 回目は変換せずキャッシュから複製する", async () => {
    // 出力を消しても、キャッシュが残っていれば再変換は起きない
    fs.rmSync(outDir(), { recursive: true, force: true });

    const { converted, cached, manifest } = await optimizeImages(assets, {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(converted).toBe(0);
    expect(cached).toBe(2);
    expect(fs.existsSync(path.join(outDir(), "images/articles/x/wide.avif"))).toBe(true);
    expect(manifest["/images/articles/x/wide.png"]?.width).toBe(700);
  });

  test("パラメータを変えるとキャッシュに当たらない", async () => {
    const { converted } = await optimizeImages(assets, {
      outDir: outDir(),
      cacheDir: cacheDir(),
      params: { ...AVIF_PARAMS, quality: 40 },
    });

    expect(converted).toBe(2);
  });

  test("元より大きくはしない", async () => {
    const small = await png("small.png", 200, 100);
    const { manifest } = await optimizeImages([small], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(manifest[small.url]).toEqual({
      src: "/images/articles/x/small.avif",
      width: 200,
      height: 100,
    });
  });

  test("dev は変換せず寸法だけを出す", async () => {
    const target = path.join(dir, "dev-out");
    const manifest = await measureImages(assets);

    // 原寸を指したまま、寸法だけが付く
    expect(manifest["/images/articles/x/wide.png"]).toEqual({
      src: "/images/articles/x/wide.png",
      width: 700,
      height: 350,
    });
    expect(fs.existsSync(target)).toBe(false);
  });
});
