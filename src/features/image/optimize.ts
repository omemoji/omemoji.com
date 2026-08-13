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
export const PIPELINE_VERSION = 2;

/**
 * 描画側が求める大きさ。**CSS ピクセル**（= `width` / `height` 属性と同じ値）。
 *
 * - 両方あり: その箱に切り抜く（ギャラリーやアイコン）
 * - 幅だけ: 幅に収める（縦横比はそのまま）
 * - 無し: 本文用（幅 700px・高さ 540px 上限）
 *
 * **どの大きさを作るかは呼び出し側が決めない。**描画中に求められたものを記録し、
 * 足りなければ後から作る（features/image/manifest.ts）
 */
export type ImageRequest = { width?: number; height?: number };

/** 求めた相手を含めた形。ステージへの入力になる */
export type ImageWant = { src: string } & ImageRequest;

/** 本文の画像。移植元（Astro の `<Picture>`）と同じ、幅 700px 基準・高さ 540px 上限 */
export const CONTENT_WIDTH = 700;
export const CONTENT_MAX_HEIGHT = 540;

/**
 * 切り抜く場合だけ表示サイズの 2 倍で作る（高密度画面向け）。
 *
 * 枠に収める方（本文）を 2 倍にすると、既に幅 700px あるものが 1400px になり
 * 転送量が 3 倍近くなる割に、得られるものが小さい
 */
export const COVER_SCALE = 2;

/**
 * 画質。切り抜いた画像は表示が小さいので低くてよい。
 *
 * **大きさだけを絞っても転送量は減らない。**作品画像はほぼ正方形で、本文用が既に
 * 高さ 540px 上限のため、480px にしても画素数は 2 割しか変わらない
 * （実測 29.0 KB → 27.1 KB / 枚）。効くのは quality の方（実測 15.6 KB / 枚・46% 減）
 */
const QUALITY = { inside: 70, cover: 50 } as const;

/** 変換パラメータ。`fit` で収め方を分ける */
export type ImageParams =
  | { quality: number; fit: "inside"; width: number; maxHeight?: number }
  | { quality: number; fit: "cover"; width: number; height: number };

/** 求められた大きさを変換パラメータへ移す。**ここが唯一の対応表** */
export function requestParams({ width, height }: ImageRequest): ImageParams {
  if (width !== undefined && height !== undefined) {
    return {
      quality: QUALITY.cover,
      fit: "cover",
      width: width * COVER_SCALE,
      height: height * COVER_SCALE,
    };
  }
  if (width !== undefined) {
    return { quality: QUALITY.inside, fit: "inside", width };
  }
  return {
    quality: QUALITY.inside,
    fit: "inside",
    width: CONTENT_WIDTH,
    maxHeight: CONTENT_MAX_HEIGHT,
  };
}

/**
 * 求められた大きさの呼び名。マニフェストの鍵と出力ファイル名になる。
 * 本文用（既定）だけは名前を持たず、`a.png` → `a.avif` になる
 */
export function requestKey({ width, height }: ImageRequest): string {
  if (width !== undefined && height !== undefined) {
    return `${width}x${height}`;
  }
  return width === undefined ? "default" : `${width}w`;
}

/** 1 枚の画像の描画に必要な情報。原寸ではなく**出力された画像**の寸法を持つ */
export type ImageEntry = { src: string; width: number; height: number };

/**
 * 元画像の配信 URL → 求められた大きさ → 出力された画像。
 *
 * 1 枚の元画像から複数の大きさを作るため、2 段の表になっている
 */
export type ImageManifest = Record<string, Record<string, ImageEntry>>;

/** sharp が扱えないもの（ベクタ・アニメーション）は変換せず原寸のまま配信する */
const RASTER = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

const isRaster = (file: string): boolean => RASTER.includes(path.extname(file).toLowerCase());

/**
 * 出力する画像の寸法。
 *
 * `inside` は高さを `min(元の高さ * 幅 / 元の幅, 上限)` に収め、幅はそこから逆算する。
 * 縦長の画像が本文を占領しないための上限であり、`content-image` の
 * `max-block-size: 540px` と同じ値を画像側でも満たしておく。
 *
 * `cover` は元の縦横比によらず求められた箱そのもの。切り抜きは sharp に任せる
 */
export function displaySize(
  width: number,
  height: number,
  params: ImageParams
): { width: number; height: number } {
  if (params.fit === "cover") {
    return { width: params.width, height: params.height };
  }

  const scaled = Math.min(
    (height * params.width) / width,
    params.maxHeight ?? Number.MAX_SAFE_INTEGER
  );
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

/**
 * `.png` を `.avif` へ。URL と出力先の両方で使う。
 * 本文用以外は求められた大きさを挟む（`a.png` → `a.240x240.avif`）
 */
const toAvif = (file: string, key: string): string =>
  file.replace(/\.[^.]+$/, key === "default" ? ".avif" : `.${key}.avif`);

/** 求められた大きさの一覧を、同じものが 2 度出てこない形に均す */
export function uniqueWants(wants: ImageWant[]): ImageWant[] {
  const byKey = new Map<string, ImageWant>();
  for (const want of wants) {
    byKey.set(`${want.src}|${requestKey(want)}`, want);
  }
  return [...byKey.values()];
}

export type OptimizeOptions = {
  /** 変換済み画像の書き出し先（`out/`）。省くと複製せず、キャッシュだけを埋める */
  outDir?: string;
  /** 永続キャッシュの置き場（`.cache/images`） */
  cacheDir: string;
  concurrency?: number;
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

/** 求められた大きさを、実体のある画像へ結び付ける */
const resolveWants = (
  assets: ImageAsset[],
  wants: ImageWant[]
): { asset: ImageAsset; want: ImageWant }[] => {
  const byUrl = new Map(assets.filter((asset) => isRaster(asset.from)).map((a) => [a.url, a]));

  return uniqueWants(wants).flatMap((want) => {
    const asset = byUrl.get(want.src);
    // 変換できない画像（svg）と、実体を持たない参照は黙って飛ばす
    return asset ? [{ asset, want }] : [];
  });
};

/**
 * 画像最適化のステージ。**求められた大きさの一覧** → 変換済み画像 + 寸法マニフェスト。
 *
 * 呼び出し側との受け渡しはファイルとマニフェストだけに閉じてあるので、
 * 中身を別ツール（vips / avifenc）へ差し替えても外側は変わらない。
 */
export async function optimizeImages(
  assets: ImageAsset[],
  wants: ImageWant[],
  { outDir, cacheDir, concurrency = 8 }: OptimizeOptions
): Promise<OptimizeResult> {
  const index = readIndex(cacheDir);
  const manifest: ImageManifest = {};
  let converted = 0;
  let cached = 0;

  const passthrough = assets.filter((asset) => !isRaster(asset.from)).length;
  const tasks = resolveWants(assets, wants);

  const write = (to: string, body: Uint8Array | string): void => {
    if (!outDir) {
      return;
    }
    const dest = path.join(outDir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (typeof body === "string") {
      fs.copyFileSync(body, dest);
    } else {
      fs.writeFileSync(dest, body);
    }
  };

  const entries = await mapWithLimit(tasks, concurrency, async ({ asset, want }) => {
    const params = requestParams(want);
    const key = requestKey(want);
    const bytes = fs.readFileSync(asset.from);
    const hash = cacheKey(bytes, params);
    const to = toAvif(asset.to, key);
    const url = toAvif(asset.url, key);

    const hit = index[hash];
    if (hit && fs.existsSync(path.join(cacheDir, hit.file))) {
      cached++;
      write(to, path.join(cacheDir, hit.file));
      return [asset.url, key, { src: url, width: hit.width, height: hit.height }] as const;
    }

    const image = sharp(bytes);
    const meta = await image.metadata();
    const target = displaySize(meta.width, meta.height, params);

    const { data, info } = await image
      // 元より大きくはしない。小さい画像を引き伸ばしても情報は増えず、容量だけ増える
      .resize({ ...target, withoutEnlargement: true, fit: params.fit })
      .avif({ quality: params.quality })
      .toBuffer({ resolveWithObject: true });

    converted++;
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, `${hash}.avif`), data);
    index[hash] = { file: `${hash}.avif`, width: info.width, height: info.height };
    write(to, data);

    return [asset.url, key, { src: url, width: info.width, height: info.height }] as const;
  });

  for (const [url, key, entry] of entries) {
    manifest[url] = { ...manifest[url], [key]: entry };
  }

  writeIndex(cacheDir, index);

  return { manifest, converted, cached, passthrough };
}

export type CachedImages = {
  /** 変換済みのものだけを載せた寸法マニフェスト */
  manifest: ImageManifest;
  /** 配信 URL → キャッシュ上の実体。dev がこれを見て変換済みの画像を返す */
  files: Record<string, string>;
  /** まだ変換されていない要求。dev は裏で変換する */
  missing: ImageWant[];
};

/**
 * **変換せずに**キャッシュだけを見る。dev 用。
 *
 * ビルド済みのキャッシュがあれば dev もそれを配信できる。原寸を配信すると
 * 作品一覧 1 ページで 16 MB になり（本番は 358 KB）、連続して遷移したときに
 * 転送とデコードが後続の表示を圧迫する。
 *
 * 入力バイトのハッシュが要るので 100 MB 前後を読む。呼び出し側で覚えること
 */
export function cachedImages(
  assets: ImageAsset[],
  wants: ImageWant[],
  { cacheDir }: { cacheDir: string }
): CachedImages {
  const index = readIndex(cacheDir);
  const manifest: ImageManifest = {};
  const files: Record<string, string> = {};
  const missing: ImageWant[] = [];
  const bytesOf = new Map<string, Buffer>();

  for (const { asset, want } of resolveWants(assets, wants)) {
    const bytes = bytesOf.get(asset.from) ?? fs.readFileSync(asset.from);
    bytesOf.set(asset.from, bytes);

    const key = requestKey(want);
    const hit = index[cacheKey(bytes, requestParams(want))];
    const file = hit && path.join(cacheDir, hit.file);

    if (!hit || !file || !fs.existsSync(file)) {
      missing.push(want);
      continue;
    }

    const url = toAvif(asset.url, key);
    manifest[asset.url] = {
      ...manifest[asset.url],
      [key]: { src: url, width: hit.width, height: hit.height },
    };
    files[url] = file;
  }

  return { manifest, files, missing };
}

/**
 * 求められた大きさを覚えておく。`.cache/images/requests.json`。
 *
 * これが無いと、キャッシュが温まっていても「どの大きさを引けばよいか」が
 * 描画するまで分からず、毎回 2 回描くことになる
 */
const wantsFile = (cacheDir: string): string => path.join(cacheDir, "requests.json");

export function readWants(cacheDir: string): ImageWant[] {
  try {
    return JSON.parse(fs.readFileSync(wantsFile(cacheDir), "utf-8")) as ImageWant[];
  } catch {
    return [];
  }
}

export function writeWants(cacheDir: string, wants: ImageWant[]): void {
  const sorted = uniqueWants(wants).sort((a, b) =>
    `${a.src}|${requestKey(a)}`.localeCompare(`${b.src}|${requestKey(b)}`)
  );
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(wantsFile(cacheDir), `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

/**
 * 寸法だけを測る。dev 用。
 *
 * AVIF の変換は 1 枚あたり 100ms 近くかかるため dev では走らせない。
 * 原寸を配信したまま width / height を出せば、レイアウトのずれ（CLS）は本番と同じに見える。
 */
export async function measureImages(
  assets: ImageAsset[],
  { concurrency = 8 }: { concurrency?: number } = {}
): Promise<ImageManifest> {
  const manifest: ImageManifest = {};

  const entries = await mapWithLimit(assets, concurrency, async (asset) => {
    if (!isRaster(asset.from)) return null;

    // metadata はヘッダだけを読む。デコードは走らない
    const meta = await sharp(asset.from).metadata();
    const size = displaySize(meta.width, meta.height, requestParams({}));
    return [asset.url, { src: asset.url, ...size }] as const;
  });

  for (const entry of entries) {
    if (entry) {
      // dev が持つのは本文用の 1 種類だけ。切り抜きが要る場所は変換されるまで原寸で出る
      manifest[entry[0]] = { default: entry[1] };
    }
  }

  return manifest;
}
