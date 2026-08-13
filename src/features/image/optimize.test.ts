import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import type { ImageAsset } from "@/features/image/assets";
import {
  cachedImages,
  cacheKey,
  displaySize,
  encoderVersion,
  type ImageWant,
  measureImages,
  optimizeImages,
  readWants,
  requestKey,
  requestParams,
  writeWants,
} from "@/features/image/optimize";

/** 本文用（大きさを求めない）の呼び名 */
const DEFAULT = requestKey({});

/** 本文用（大きさを求めない）の変換パラメータ */
const CONTENT = requestParams({});

describe("求められた大きさの解釈", () => {
  test.each<[ImageWant | Record<string, number>, string]>([
    [{}, "default"],
    [{ width: 700 }, "700w"],
    [{ width: 240, height: 240 }, "240x240"],
  ])("%o の呼び名は %s", (request, expected) => {
    expect(requestKey(request)).toBe(expected);
  });

  test("両方あれば切り抜き、実体は表示の 2 倍で作る", () => {
    expect(requestParams({ width: 240, height: 240 })).toEqual({
      quality: 50,
      fit: "cover",
      width: 480,
      height: 480,
    });
  });

  test("幅だけなら枠に収める。等倍で作る", () => {
    expect(requestParams({ width: 700 })).toEqual({ quality: 70, fit: "inside", width: 700 });
  });

  test("求めなければ本文用（幅 700px・高さ 540px 上限）", () => {
    expect(requestParams({})).toEqual({
      quality: 70,
      fit: "inside",
      width: 700,
      maxHeight: 540,
    });
  });
});

describe("表示サイズ", () => {
  test.each([
    // 横長は幅 700px に合わせる
    [1400, 700, { width: 700, height: 350 }],
    // 高さが 540px を超えるものは高さで律速する（幅は逆算）
    [700, 1400, { width: 270, height: 540 }],
    [1000, 1000, { width: 540, height: 540 }],
  ])("%i x %i → %o", (width, height, expected) => {
    expect(displaySize(width, height, CONTENT)).toEqual(expected);
  });

  test("高さは上限を超えない", () => {
    expect(displaySize(100, 5000, CONTENT).height).toBe(540);
  });

  test("切り抜きは元の縦横比によらず求められた箱になる", () => {
    expect(displaySize(3000, 1000, requestParams({ width: 240, height: 240 }))).toEqual({
      width: 480,
      height: 480,
    });
  });
});

describe("キャッシュのキー", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  test("同じ入力・同じパラメータなら同じ", () => {
    expect(cacheKey(bytes, CONTENT)).toBe(cacheKey(bytes, CONTENT));
  });

  test("入力が違えば違う", () => {
    expect(cacheKey(bytes, CONTENT)).not.toBe(cacheKey(new Uint8Array([1, 2, 4]), CONTENT));
  });

  test("パラメータが違えば違う", () => {
    // ここが効かないと quality を変えても古い出力が残る
    expect(cacheKey(bytes, CONTENT)).not.toBe(cacheKey(bytes, { ...CONTENT, quality: 50 }));
  });

  test("変換器のバージョンが違えば違う", () => {
    // sharp を上げても当たり続けると、古いエンコーダの出力が残る
    expect(cacheKey(bytes, CONTENT, "sharp@0.35.3")).not.toBe(
      cacheKey(bytes, CONTENT, "sharp@0.36.0")
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

  /** 本文用（大きさを求めない）の要求 */
  const contentWants = (): ImageWant[] => assets.map(({ url }) => ({ src: url }));

  test("AVIF を出力し、出力された寸法をマニフェストに載せる", async () => {
    const { manifest, converted } = await optimizeImages(assets, contentWants(), {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(converted).toBe(2);
    expect(manifest["/images/articles/x/wide.png"]?.[DEFAULT]).toEqual({
      src: "/images/articles/x/wide.avif",
      width: 700,
      height: 350,
    });
    expect(fs.existsSync(path.join(outDir(), "images/articles/x/wide.avif"))).toBe(true);

    const meta = await sharp(path.join(outDir(), "images/articles/x/tall.avif")).metadata();
    expect(meta.format).toBe("heif");
    expect(meta.height).toBe(540);
  });

  test("求められていない大きさは作らない", async () => {
    const { converted, cached, manifest } = await optimizeImages(assets, [], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect([converted, cached]).toEqual([0, 0]);
    expect(manifest).toEqual({});
  });

  test("2 回目は変換せずキャッシュから複製する", async () => {
    // 出力を消しても、キャッシュが残っていれば再変換は起きない
    fs.rmSync(outDir(), { recursive: true, force: true });

    const { converted, cached, manifest } = await optimizeImages(assets, contentWants(), {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(converted).toBe(0);
    expect(cached).toBe(2);
    expect(fs.existsSync(path.join(outDir(), "images/articles/x/wide.avif"))).toBe(true);
    expect(manifest["/images/articles/x/wide.png"]?.[DEFAULT]?.width).toBe(700);
  });

  test("元より大きくはしない", async () => {
    const small = await png("small.png", 200, 100);
    const { manifest } = await optimizeImages([small], [{ src: small.url }], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(manifest[small.url]?.[DEFAULT]).toEqual({
      src: "/images/articles/x/small.avif",
      width: 200,
      height: 100,
    });
  });

  test("求められた大きさごとに別のファイルを出す", async () => {
    const src = "/images/articles/x/wide.png";
    const { manifest } = await optimizeImages(assets, [{ src }, { src, width: 240, height: 240 }], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });
    const entry = manifest[src];

    // 本文用だけは名前を持たない。上書きし合わないこと
    expect(entry?.[DEFAULT]?.src).toBe("/images/articles/x/wide.avif");
    expect(entry?.["240x240"]).toEqual({
      src: "/images/articles/x/wide.240x240.avif",
      width: 480,
      height: 480,
    });

    // 正方形に切り抜いた実体が出ている（CSS ではなくビルド時に切る）
    const meta = await sharp(path.join(outDir(), "images/articles/x/wide.240x240.avif")).metadata();
    expect([meta.width, meta.height]).toEqual([480, 480]);
  });

  test("求められた画像だけを変換する", async () => {
    const src = "/images/articles/x/wide.png";
    const { manifest } = await optimizeImages(assets, [{ src, width: 160, height: 160 }], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(manifest[src]?.["160x160"]).toBeDefined();
    // 求められていない画像に無駄な変換をかけない
    expect(manifest["/images/articles/x/tall.png"]).toBeUndefined();
  });

  test("実体を持たない要求は黙って飛ばす", async () => {
    const { converted, manifest } = await optimizeImages(assets, [{ src: "/images/none.png" }], {
      outDir: outDir(),
      cacheDir: cacheDir(),
    });

    expect(converted).toBe(0);
    expect(manifest).toEqual({});
  });

  describe("求められた大きさの記録", () => {
    test("書いて読み戻せる", () => {
      const wants: ImageWant[] = [{ src: "/a.png" }, { src: "/a.png", width: 240, height: 240 }];
      writeWants(cacheDir(), wants);

      expect(readWants(cacheDir())).toEqual(expect.arrayContaining(wants));
    });

    test("同じ要求は 1 つに畳む", () => {
      writeWants(cacheDir(), [{ src: "/a.png" }, { src: "/a.png" }]);

      expect(readWants(cacheDir())).toEqual([{ src: "/a.png" }]);
    });

    test("無ければ空", () => {
      expect(readWants(path.join(dir, "none"))).toEqual([]);
    });
  });

  describe("キャッシュだけを見る（dev）", () => {
    test("未変換なら missing に並び、マニフェストは空", () => {
      const fresh = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-cold-"));
      const cached = cachedImages(assets, contentWants(), { cacheDir: fresh });

      expect(cached.manifest).toEqual({});
      expect(cached.missing).toHaveLength(assets.length);
      fs.rmSync(fresh, { recursive: true, force: true });
    });

    test("変換済みならキャッシュ上の実体を指す", async () => {
      const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-warm-"));
      await optimizeImages(assets, contentWants(), { cacheDir: dir2 });

      const cached = cachedImages(assets, contentWants(), { cacheDir: dir2 });
      const url = "/images/articles/x/wide.avif";

      expect(cached.missing).toEqual([]);
      expect(cached.manifest["/images/articles/x/wide.png"]?.[DEFAULT]?.src).toBe(url);
      // dev はこの実体をそのまま配信する
      expect(fs.existsSync(cached.files[url] ?? "")).toBe(true);
      fs.rmSync(dir2, { recursive: true, force: true });
    });

    test("出力先を省くと out へ複製しない（キャッシュだけ埋める）", async () => {
      const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-image-nocopy-"));
      const { converted } = await optimizeImages(assets, contentWants(), { cacheDir: dir3 });

      expect(converted).toBe(assets.length);
      expect(cachedImages(assets, contentWants(), { cacheDir: dir3 }).missing).toEqual([]);
      fs.rmSync(dir3, { recursive: true, force: true });
    });
  });

  test("dev は変換せず寸法だけを出す", async () => {
    const target = path.join(dir, "dev-out");
    const manifest = await measureImages(assets);

    // 原寸を指したまま、寸法だけが付く
    expect(manifest["/images/articles/x/wide.png"]?.[DEFAULT]).toEqual({
      src: "/images/articles/x/wide.png",
      width: 700,
      height: 350,
    });
    expect(fs.existsSync(target)).toBe(false);
  });
});
