import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { mapWithLimit } from "@/features/concurrency";
import { type Fetcher, type FetchMetaOptions, fetchMeta } from "@/features/link-card/fetch-meta";

/** カード 1 枚の描画に必要な情報。画像は自前で持つサムネイルを指す */
export type LinkCard = {
  url: string;
  title: string;
  description: string;
  image?: { src: string; width: number; height: number };
};

/** リンク先の URL → カード。取得できなかった URL は載らない */
export type LinkCardManifest = Record<string, LinkCard>;

/** サムネイルの配信先。移植元と同じ URL 規則 */
const THUMB_DIR = "images/ogp_link";
const THUMB_HEIGHT = 120;
const THUMB_QUALITY = 30;

const thumbName = (url: string): string =>
  `${crypto.createHash("sha256").update(url).digest("hex").slice(0, 16)}.webp`;

/**
 * 取得済みのメタデータ。`.cache/link-meta.json` にそのまま入る。
 *
 * サムネイルの実体は `<cacheDir>/<ハッシュ>.webp`。マニフェストと同じ形で持つので、
 * キャッシュに当たった場合は複製するだけで済む
 */
type CacheFile = Record<string, LinkCard>;

const readCache = (file: string): CacheFile => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as CacheFile;
  } catch {
    // 初回・壊れている場合は空から始める
    return {};
  }
};

const writeCache = (file: string, cache: CacheFile): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cache, null, 2)}\n`, "utf-8");
};

const copyTo = (from: string, outDir: string, to: string): void => {
  const dest = path.join(outDir, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
};

/**
 * OGP 画像を取得してサムネイルにする。高さ 120px の webp。
 *
 * 取得先の画像をそのまま参照すると、相手のサイトが消えた時点でカードが崩れ、
 * 大きさもまちまちになる。自前で持てば `out/` の中で完結する。
 */
async function makeThumbnail(
  imageUrl: string,
  cacheDir: string,
  fetcher: Fetcher
): Promise<LinkCard["image"]> {
  try {
    const response = await fetcher(imageUrl, { headers: { Accept: "image/*,*/*;q=0.8" } });
    if (!response.ok) {
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .resize({ height: THUMB_HEIGHT, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const name = thumbName(imageUrl);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, name), data);

    return { src: `/${THUMB_DIR}/${name}`, width: info.width, height: info.height };
  } catch {
    // 画像が取れなくてもカードは出せる。文字だけのカードになる
    return undefined;
  }
}

export type CollectOptions = {
  /** 取得済みメタデータの置き場。既定は `.cache/link-meta.json` を想定して呼び出し側が渡す */
  cacheFile: string;
  /** サムネイルの実体を溜める場所 */
  cacheDir: string;
  /** サムネイルの複製先。dev は複製しないので省く */
  outDir?: string;
  /**
   * ネットワークを使わない。dev はこちら。
   * キャッシュにある分だけカードになり、無いものは素のリンクとして出る
   */
  offline?: boolean;
  concurrency?: number;
} & FetchMetaOptions;

export type CollectResult = {
  manifest: LinkCardManifest;
  /** 新たに取得した URL 数。2 回目のビルドでは 0 */
  fetched: number;
  cached: number;
  /** 取得できなかった URL。素のリンクとして描画される */
  failed: string[];
};

/**
 * リンクカードのステージ。URL 一覧 → メタデータ JSON + サムネイル。
 *
 * **キャッシュに当たった URL はネットワークを触らない。**取得に失敗した URL は
 * キャッシュに残さず、次のビルドで取り直す。ビルドは落とさない
 */
export async function collectLinkCards(
  urls: string[],
  { cacheFile, cacheDir, outDir, offline = false, concurrency = 6, ...fetchOptions }: CollectOptions
): Promise<CollectResult> {
  const cache = readCache(cacheFile);
  const manifest: LinkCardManifest = {};
  const failed: string[] = [];
  let fetched = 0;
  let cached = 0;

  /**
   * マニフェストへ載せ、サムネイルを出力先へ複製する。
   *
   * 実体が無いサムネイルは参照ごと落とす。メタデータだけをコミットして
   * `.cache/` の画像が無い環境でも、壊れた `<img>` を出さずに文字だけのカードになる
   */
  const publish = (card: LinkCard): void => {
    const thumb = card.image && path.join(cacheDir, path.basename(card.image.src));

    if (!thumb || !fs.existsSync(thumb)) {
      const { image: _, ...withoutImage } = card;
      manifest[card.url] = withoutImage;
      return;
    }

    manifest[card.url] = card;
    if (outDir) {
      copyTo(thumb, outDir, path.join(THUMB_DIR, path.basename(thumb)));
    }
  };

  await mapWithLimit(urls, concurrency, async (url) => {
    const hit = cache[url];
    if (hit) {
      cached++;
      publish(hit);
      return;
    }

    if (offline) {
      // dev はここで止める。取得は本番ビルドの仕事
      failed.push(url);
      return;
    }

    const meta = await fetchMeta(url, fetchOptions);
    if (!meta) {
      failed.push(url);
      return;
    }

    const fetcher = fetchOptions.fetch ?? fetch;
    const image =
      meta.image === "" ? undefined : await makeThumbnail(meta.image, cacheDir, fetcher);
    const card: LinkCard = {
      url,
      title: meta.title,
      description: meta.description,
      ...(image ? { image } : {}),
    };

    fetched++;
    cache[url] = card;
    publish(card);
  });

  if (!offline && fetched > 0) {
    writeCache(cacheFile, cache);
  }

  return { manifest, fetched, cached, failed };
}
