import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import type { ImageAsset } from "@/features/image/assets";
import {
  AVIF_PARAMS,
  CONTENT_VARIANT,
  cachedImages,
  cacheKey,
  displaySize,
  encoderVersion,
  measureImages,
  optimizeImages,
  THUMB_PARAMS,
  THUMB_VARIANT,
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

    // 540px。ImageParams は判別可能な合併なので、fit で絞ってから読む
    expect(height).toBe(AVIF_PARAMS.fit === "inside" ? AVIF_PARAMS.maxHeight : 0);
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

  test("変換器のバージョンが違えば違う", () => {
    // sharp を上げても当たり続けると、古いエンコーダの出力が残る
    expect(cacheKey(bytes, AVIF_PARAMS, "sharp@0.35.3")).not.toBe(
      cacheKey(bytes, AVIF_PARAMS, "sharp@0.36.0")
    );
  });

  test("変換器のバージョンには AVIF の出力を左右するものだけが入る", () => {
    // 無関係な更新（フォント周りなど）で全件の焼き直しにならないこと
    expect(encoderVersion()).toContain("vips@");
    expect(encoderVersion()).toContain("aom@");
    expect(encoderVersion()).not.toContain("pango");
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
    expect(manifest["/images/articles/x/wide.png"]?.[CONTENT_VARIANT]).toEqual({
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
    expect(manifest["/images/articles/x/wide.png"]?.[CONTENT_VARIANT]?.width).toBe(700);
  });

  test("パラメータを変えるとキャッシュに当たらない", async () => {
    const { converted } = await optimizeImages(assets, {
      outDir: outDir(),
      cacheDir: cacheDir(),
      variants: [{ name: CONTENT_VARIANT, params: { ...AVIF_PARAMS, quality: 40 } }],
    });

    expect(converted).toBe(2);
  });

  test("元より大きくはしない", async () => {
    const small = await png("small.png", 200, 100);
    const { manifest } = await optimizeImages([small], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(manifest[small.url]?.[CONTENT_VARIANT]).toEqual({
      src: "/images/articles/x/small.avif",
      width: 200,
      height: 100,
    });
  });

  test("バリアントごとに別のファイルを出す", async () => {
    const { manifest } = await optimizeImages(assets, {
      outDir: outDir(),
      cacheDir: cacheDir(),
      variants: [
        { name: CONTENT_VARIANT, params: AVIF_PARAMS },
        { name: THUMB_VARIANT, params: THUMB_PARAMS },
      ],
    });
    const entry = manifest["/images/articles/x/wide.png"];

    // 既定のバリアントは名前を挟まない。上書きし合わないこと
    expect(entry?.[CONTENT_VARIANT]?.src).toBe("/images/articles/x/wide.avif");
    expect(entry?.[THUMB_VARIANT]).toEqual({
      src: "/images/articles/x/wide.thumb.avif",
      width: 480,
      height: 480,
    });

    // 正方形に切り抜いた実体が出ている（CSS ではなくビルド時に切る）
    const meta = await sharp(path.join(outDir(), "images/articles/x/wide.thumb.avif")).metadata();
    expect([meta.width, meta.height]).toEqual([480, 480]);
  });

  test("バリアントを絞れる", async () => {
    const { manifest } = await optimizeImages(assets, {
      outDir: outDir(),
      cacheDir: cacheDir(),
      variants: [
        { name: CONTENT_VARIANT, params: AVIF_PARAMS },
        {
          name: THUMB_VARIANT,
          params: THUMB_PARAMS,
          match: (asset) => asset.url.endsWith("wide.png"),
        },
      ],
    });

    expect(manifest["/images/articles/x/wide.png"]?.[THUMB_VARIANT]).toBeDefined();
    // 対象外の画像に無駄な変換をかけない
    expect(manifest["/images/articles/x/tall.png"]?.[THUMB_VARIANT]).toBeUndefined();
    expect(manifest["/images/articles/x/tall.png"]?.[CONTENT_VARIANT]).toBeDefined();
  });

  describe("キャッシュだけを見る（dev）", () => {
    test("未変換なら missing に並び、マニフェストは空", async () => {
      const fresh = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-cold-"));
      const cached = cachedImages(assets, { cacheDir: fresh });

      expect(cached.manifest).toEqual({});
      expect(cached.missing).toHaveLength(assets.length);
      fs.rmSync(fresh, { recursive: true, force: true });
    });

    test("変換済みならキャッシュ上の実体を指す", async () => {
      const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-warm-"));
      await optimizeImages(assets, { outDir: path.join(dir2, "out"), cacheDir: dir2 });

      const cached = cachedImages(assets, { cacheDir: dir2 });
      const url = "/images/articles/x/wide.avif";

      expect(cached.missing).toEqual([]);
      expect(cached.manifest["/images/articles/x/wide.png"]?.[CONTENT_VARIANT]?.src).toBe(url);
      // dev はこの実体をそのまま配信する
      expect(fs.existsSync(cached.files[url] ?? "")).toBe(true);
      fs.rmSync(dir2, { recursive: true, force: true });
    });

    test("出力先を省くと out へ複製しない（キャッシュだけ埋める）", async () => {
      const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-nocopy-"));
      const { converted } = await optimizeImages(assets, { cacheDir: dir3 });

      expect(converted).toBe(assets.length);
      expect(cachedImages(assets, { cacheDir: dir3 }).missing).toEqual([]);
      fs.rmSync(dir3, { recursive: true, force: true });
    });
  });

  test("dev は変換せず寸法だけを出す", async () => {
    const target = path.join(dir, "dev-out");
    const manifest = await measureImages(assets);

    // 原寸を指したまま、寸法だけが付く
    expect(manifest["/images/articles/x/wide.png"]?.[CONTENT_VARIANT]).toEqual({
      src: "/images/articles/x/wide.png",
      width: 700,
      height: 350,
    });
    expect(fs.existsSync(target)).toBe(false);
  });
});
