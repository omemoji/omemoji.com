import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { mapWithLimit } from "@/features/concurrency";
import { renderTitleSvg, textAssetsKey } from "@/features/og/template";

/**
 * 変換パラメータを変えたらこれを上げる。画像の最適化（features/image）と同じ考え方で、
 * キャッシュのキーに含めることで古い出力が生き残らないようにする。
 */
export const OG_VERSION = 2;

/** OGP 画像の仕様。1200x630 は Twitter / Facebook が大きいカードで使う比率 */
export const OG_PARAMS = {
  width: 1200,
  height: 630,
  /** 余白の色。作品が縦長でも横長でも同じ額装になる */
  background: "#555555",
  quality: 60,
} as const;

export type OgParams = typeof OG_PARAMS;

/**
 * 生成元。path は OGP を持たせるページのパス。
 *
 * 作品は画像 1 枚を額装し、記事はタイトルを描く。**絵柄だけでなく使われ方も違う**
 * （features/og/manifest.ts の OgImage.kind）
 */
export type OgSource =
  | { kind: "artwork"; path: string; from: string }
  | { kind: "article"; path: string; title: string };

/** ページの `<head>` に出す画像。kind で `og:image` に出すかどうかが決まる */
export type OgImage = {
  src: string;
  width: number;
  height: number;
  kind: OgSource["kind"];
};

/** ページのパス → OGP 画像。持たないページは載らず、共通の画像へ倒す */
export type OgManifest = Record<string, OgImage>;

/** 配信 URL。ページのパスから機械的に決める（`/artworks/x` → `/images/og/artworks/x.png`） */
export const ogUrl = (pagePath: string): string =>
  `/images/og${pagePath.split("/").map(encodeURIComponent).join("/")}.png`;

/** 出力先。`out/` 直下からの相対パス */
const ogFile = (pagePath: string): string => path.join("images/og", `${pagePath}.png`);

/**
 * キャッシュのキー。生成元の中身（作品は画像バイト列、記事はタイトルと素材）から作る。
 * 中身が同じなら 2 回目以降は描き直さない
 */
const cacheKey = (source: OgSource, params: OgParams): string => {
  const hash = crypto.createHash("sha256");
  if (source.kind === "artwork") {
    hash.update(fs.readFileSync(source.from));
  } else {
    hash.update(source.title).update(textAssetsKey());
  }
  return hash
    .update(
      JSON.stringify({
        ...params,
        kind: source.kind,
        version: OG_VERSION,
        sharp: sharp.versions.sharp,
      })
    )
    .digest("hex")
    .slice(0, 16);
};

/**
 * 作品の OGP 画像。作品画像 1 枚を額装するだけで、文字は載せない。
 */
async function renderArtwork(from: string, params: OgParams): Promise<Buffer> {
  return await sharp(fs.readFileSync(from))
    // contain で全体を見せる。cover にすると作品が切れる
    .resize(params.width, params.height, { fit: "contain", background: params.background })
    .png({ quality: params.quality })
    .toBuffer();
}

/**
 * 記事の OGP 画像。satori（React → SVG）でタイトルを描き、sharp で PNG にする。
 *
 * **この画像は Twitter Card にしか出さない。**通常のリンクカードは共通の画像
 * （omemoji.png）を使う（layouts/Layout.tsx）
 */
async function renderArticle(title: string, params: OgParams): Promise<Buffer> {
  const svg = await renderTitleSvg(title, { width: params.width, height: params.height });
  return await sharp(Buffer.from(svg)).png({ quality: params.quality }).toBuffer();
}

const render = async (source: OgSource, params: OgParams): Promise<Buffer> =>
  source.kind === "artwork"
    ? await renderArtwork(source.from, params)
    : await renderArticle(source.title, params);

export type GenerateOptions = {
  outDir: string;
  cacheDir: string;
  concurrency?: number;
  params?: OgParams;
};

export type GenerateResult = {
  manifest: OgManifest;
  /** 実際に生成した枚数。2 回目のビルドでは 0 */
  generated: number;
  cached: number;
};

/**
 * OGP 画像のステージ。生成元の一覧 → PNG + マニフェスト。
 *
 * 画像の最適化・リンクカードと同じ形。描画の前にビルドが 1 度だけ呼び、
 * `<head>` はマニフェストから引く
 */
export async function generateOgImages(
  sources: OgSource[],
  { outDir, cacheDir, concurrency = 4, params = OG_PARAMS }: GenerateOptions
): Promise<GenerateResult> {
  const manifest: OgManifest = {};
  let generated = 0;
  let cached = 0;

  const entries = await mapWithLimit(sources, concurrency, async (source) => {
    const key = cacheKey(source, params);
    const cacheFile = path.join(cacheDir, `${key}.png`);

    if (fs.existsSync(cacheFile)) {
      cached++;
    } else {
      generated++;
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, await render(source, params));
    }

    const dest = path.join(outDir, ogFile(source.path));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(cacheFile, dest);

    return [
      source.path,
      { src: ogUrl(source.path), width: params.width, height: params.height, kind: source.kind },
    ] as const;
  });

  for (const [pagePath, image] of entries) {
    manifest[pagePath] = image;
  }

  return { manifest, generated, cached };
}
