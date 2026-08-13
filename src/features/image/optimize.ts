import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { mapWithLimit } from "@/features/concurrency";
import type { ImageAsset } from "@/features/image/assets";

/**
 * 変換パラメータを変えたらこれを上げる。
 *
 * キャッシュのキーに含めるため、上げた時点で全件が作り直される。
 * 入力バイトだけをキーにすると、パラメータを変えても古い出力が生き残る。
 */
export const PIPELINE_VERSION = 1;

export type ImageParams = { quality: number; targetWidth: number; maxHeight: number };

/** 移植元（Astro の `<Picture>`）と同じ値。幅 700px 基準・高さ 540px 上限 */
export const AVIF_PARAMS: ImageParams = { quality: 70, targetWidth: 700, maxHeight: 540 };

/** 1 枚の画像の描画に必要な情報。原寸ではなく**出力された画像**の寸法を持つ */
export type ImageEntry = { src: string; width: number; height: number };

/** 元画像の配信 URL → 出力された画像。ステージ間の受け渡しはこれだけ */
export type ImageManifest = Record<string, ImageEntry>;

/** sharp が扱えないもの（ベクタ・アニメーション）は変換せず原寸のまま配信する */
const RASTER = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

const isRaster = (file: string): boolean => RASTER.includes(path.extname(file).toLowerCase());

/**
 * 表示サイズ。高さを `min(元の高さ * 700 / 元の幅, 540)` に収め、幅はそこから逆算する。
 *
 * 縦長の画像が本文を占領しないための上限であり、`content-image` の
 * `max-block-size: 540px` と同じ値を画像側でも満たしておく。
 */
export function displaySize(
  width: number,
  height: number,
  { targetWidth, maxHeight }: Pick<ImageParams, "targetWidth" | "maxHeight">
): { width: number; height: number } {
  const scaled = Math.min((height * targetWidth) / width, maxHeight);
  return {
    width: Math.round((scaled * width) / height),
    height: Math.round(scaled),
  };
}

/**
 * 変換器のバージョン。AVIF の出力を左右するものだけを拾う。
 *
 * sharp を上げてもキーが変わらないと、古いエンコーダの出力がキャッシュから
 * 出続ける。CI は緑のまま生成物だけが据え置かれ、一番気付きにくい形になる。
 * pango や fontconfig まで含めると無関係な更新で全件を焼き直すことになるため入れない。
 */
export const encoderVersion = (): string =>
  JSON.stringify(
    (["sharp", "vips", "aom", "heif"] as const).map((lib) => `${lib}@${sharp.versions[lib]}`)
  );

/**
 * キャッシュのキー。入力バイト + 変換パラメータ + パイプラインのバージョン + 変換器のバージョン。
 *
 * ファイル名や mtime は含めない。同じ画像が別の記事にあれば変換は 1 回で済み、
 * `git clone` で mtime が変わっても作り直しにならない。
 */
export function cacheKey(
  bytes: Uint8Array,
  params: ImageParams,
  encoder: string = encoderVersion()
): string {
  return crypto
    .createHash("sha256")
    .update(bytes)
    .update(JSON.stringify({ ...params, version: PIPELINE_VERSION, encoder }))
    .digest("hex")
    .slice(0, 16);
}

/** `.cache/images/index.json` の中身。値は同じディレクトリにある変換済みファイルを指す */
type CacheIndex = Record<string, { file: string; width: number; height: number }>;

const indexFile = (cacheDir: string): string => path.join(cacheDir, "index.json");

function readIndex(cacheDir: string): CacheIndex {
  try {
    return JSON.parse(fs.readFileSync(indexFile(cacheDir), "utf-8")) as CacheIndex;
  } catch {
    // 初回・壊れている場合は空から始める。キャッシュは再生成できるので落とさない
    return {};
  }
}

function writeIndex(cacheDir: string, index: CacheIndex): void {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(indexFile(cacheDir), `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}

/** `.png` を `.avif` へ。URL と出力先の両方で使う */
const toAvif = (file: string): string => file.replace(/\.[^.]+$/, ".avif");

export type OptimizeOptions = {
  /** 変換済み画像の書き出し先（`out/`） */
  outDir: string;
  /** 永続キャッシュの置き場（`.cache/images`） */
  cacheDir: string;
  concurrency?: number;
  params?: ImageParams;
};

export type OptimizeResult = {
  manifest: ImageManifest;
  /** 実際に変換した枚数。2 回目のビルドでは 0 になる */
  converted: number;
  /** キャッシュから複製した枚数 */
  cached: number;
  /** 変換せず原寸のまま配信する枚数（svg・gif） */
  passthrough: number;
};

/**
 * 画像最適化のステージ。入力ファイル一覧 → 変換済み画像 + 寸法マニフェスト。
 *
 * 呼び出し側との受け渡しはファイルとマニフェストだけに閉じてあるので、
 * 中身を別ツール（vips / avifenc）へ差し替えても外側は変わらない。
 */
export async function optimizeImages(
  assets: ImageAsset[],
  { outDir, cacheDir, concurrency = 8, params = AVIF_PARAMS }: OptimizeOptions
): Promise<OptimizeResult> {
  const index = readIndex(cacheDir);
  const manifest: ImageManifest = {};
  let converted = 0;
  let cached = 0;
  let passthrough = 0;

  const write = (to: string, body: Uint8Array | string): void => {
    const dest = path.join(outDir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (typeof body === "string") {
      fs.copyFileSync(body, dest);
    } else {
      fs.writeFileSync(dest, body);
    }
  };

  const entries = await mapWithLimit(assets, concurrency, async (asset) => {
    if (!isRaster(asset.from)) {
      passthrough++;
      // 寸法が取れないもの（svg）は width / height を出さない。原寸をそのまま指す
      return null;
    }

    const bytes = fs.readFileSync(asset.from);
    const key = cacheKey(bytes, params);
    const to = toAvif(asset.to);
    const url = toAvif(asset.url);

    const hit = index[key];
    if (hit && fs.existsSync(path.join(cacheDir, hit.file))) {
      cached++;
      write(to, path.join(cacheDir, hit.file));
      return [asset.url, { src: url, width: hit.width, height: hit.height }] as const;
    }

    const image = sharp(bytes);
    const meta = await image.metadata();
    const target = displaySize(meta.width, meta.height, params);

    const { data, info } = await image
      // 元より大きくはしない。小さい画像を引き伸ばしても情報は増えず、容量だけ増える
      .resize({ ...target, withoutEnlargement: true, fit: "inside" })
      .avif({ quality: params.quality })
      .toBuffer({ resolveWithObject: true });

    converted++;
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, `${key}.avif`), data);
    index[key] = { file: `${key}.avif`, width: info.width, height: info.height };
    write(to, data);

    return [asset.url, { src: url, width: info.width, height: info.height }] as const;
  });

  for (const entry of entries) {
    if (entry) {
      manifest[entry[0]] = entry[1];
    }
  }

  writeIndex(cacheDir, index);

  return { manifest, converted, cached, passthrough };
}

/**
 * 寸法だけを測る。dev 用。
 *
 * AVIF の変換は 1 枚あたり 100ms 近くかかるため dev では走らせない。
 * 原寸を配信したまま width / height を出せば、レイアウトのずれ（CLS）は本番と同じに見える。
 */
export async function measureImages(
  assets: ImageAsset[],
  { concurrency = 8, params = AVIF_PARAMS }: { concurrency?: number; params?: ImageParams } = {}
): Promise<ImageManifest> {
  const manifest: ImageManifest = {};

  const entries = await mapWithLimit(assets, concurrency, async (asset) => {
    if (!isRaster(asset.from)) return null;

    // metadata はヘッダだけを読む。デコードは走らない
    const meta = await sharp(asset.from).metadata();
    const size = displaySize(meta.width, meta.height, params);
    return [asset.url, { src: asset.url, ...size }] as const;
  });

  for (const entry of entries) {
    if (entry) {
      manifest[entry[0]] = entry[1];
    }
  }

  return manifest;
}
