import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CheerioAPI } from "cheerio";
import { load } from "cheerio";
import sharp from "sharp";

const OGP_LINK_DIR = join(
  process.cwd(),
  import.meta.env.PROD ? "out" : "public",
  "images",
  "ogp_link"
);

const getThumbFilename = (url: string): string => {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `${hash}.webp`;
};

interface Metadata {
  url: string;
  title: string;
  description: string;
  image: { url: string; width: number; height: number };
}

const DEFAULT_OGP_WIDTH = 1200;
const DEFAULT_OGP_HEIGHT = 630;

// サブドメインかどうかを判定
const isSubdomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    // 例: blog.example.com -> ["blog", "example", "com"]
    // www.example.com は通常のドメインとして扱う
    if (parts.length > 2) {
      // co.jp, com.au などの国別ドメインを考慮
      const isCountryTLD =
        parts.length === 3 &&
        ["co", "com", "net", "org", "ac", "go", "ne"].includes(parts[1]) &&
        parts[2].length === 2;
      if (isCountryTLD) {
        return false;
      }
      // www は除外
      if (parts[0] === "www") {
        return false;
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// 親ドメインのURLを取得
const getParentDomainUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split(".");

    if (parts.length > 2) {
      // co.jp などを考慮
      const isCountryTLD =
        parts.length === 3 &&
        ["co", "com", "net", "org", "ac", "go", "ne"].includes(parts[1]) &&
        parts[2].length === 2;
      if (isCountryTLD) {
        return null;
      }
      // サブドメインを削除して親ドメインを取得
      const parentHostname = parts.slice(1).join(".");
      return `${urlObj.protocol}//${parentHostname}`;
    }
    return null;
  } catch {
    return null;
  }
};

// 環境間で一貫した結果を得るためブラウザ相当のヘッダーを使用
const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
};

// SPA等でOGPが取得できない場合のフォールバック用bot UA
const BOT_HEADERS: HeadersInit = {
  "User-Agent": "Discordbot/2.0",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 15000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...BROWSER_HEADERS, ...options.headers },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

// リトライ付きfetch（動的生成される画像は初回で失敗することがある）
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeout: number = 15000
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      if (response.ok) {
        return response;
      }
      // 5xx エラーはリトライ対象
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error as Error;
      // AbortError（タイムアウト）やネットワークエラーはリトライ
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
};

const getImageMeta = async (src: string) => {
  if (src === "" || src === undefined) {
    return { img: { url: "", width: 0, height: 0 } };
  }

  try {
    const response = await fetchWithRetry(
      src,
      {
        headers: {
          Accept: "image/*,*/*;q=0.8",
        },
      },
      2,
      15000
    );

    if (!response.ok) {
      // 画像取得に失敗しても、URLが存在すればデフォルトサイズで返す
      return {
        img: { url: src, width: DEFAULT_OGP_WIDTH, height: DEFAULT_OGP_HEIGHT },
      };
    }

    const buffer: Buffer = Buffer.from(await response.arrayBuffer());
    const bufferExists = buffer.length > 0;

    let width = 0;
    let height = 0;
    let imgUrl = src;

    if (bufferExists) {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width ?? 0;
        height = metadata.height ?? 0;

        // サムネイル生成（120px高、quality 30のwebp）
        const filename = getThumbFilename(src);
        const filepath = join(OGP_LINK_DIR, filename);

        // 既にファイルが存在する場合はスキップ
        if (!existsSync(filepath)) {
          const finalW = width > 0 ? width : DEFAULT_OGP_WIDTH;
          const finalH = height > 0 ? height : DEFAULT_OGP_HEIGHT;
          const thumbHeight = 120;
          const thumbWidth = Math.round((finalW * thumbHeight) / finalH);
          const thumbBuffer = await sharp(buffer)
            .resize(thumbWidth, thumbHeight)
            .webp({ quality: 30 })
            .toBuffer();

          if (!existsSync(OGP_LINK_DIR)) {
            mkdirSync(OGP_LINK_DIR, { recursive: true });
          }
          writeFileSync(filepath, thumbBuffer);
        }
        imgUrl = `/images/ogp_link/${filename}`;
      } catch {
        // sharp処理失敗時は元のURLをそのまま使用
      }
    }

    // width/heightが取得できなかった場合はデフォルト値を使用
    const finalWidth = width > 0 ? width : DEFAULT_OGP_WIDTH;
    const finalHeight = height > 0 ? height : DEFAULT_OGP_HEIGHT;

    return {
      img: { url: imgUrl, width: finalWidth, height: finalHeight },
    };
  } catch {
    // fetchが完全に失敗しても、URLが存在すればデフォルトサイズで返す
    return {
      img: { url: src, width: DEFAULT_OGP_WIDTH, height: DEFAULT_OGP_HEIGHT },
    };
  }
};

const metadataCache = new Map<string, Metadata>();

const detectTitle = ($: CheerioAPI, url: string) => {
  const t =
    $('meta[property="og:title"]').attr("content") ??
    $("title").text() ??
    $('meta[name="title"]').attr("content") ??
    url;
  return t;
};

// 親ドメインからOGP画像を取得する（フォールバック用）
const fetchImageFromParentDomain = async (
  url: string
): Promise<{ url: string; width: number; height: number }> => {
  const parentUrl = getParentDomainUrl(url);
  if (!parentUrl) {
    return { url: "", width: 0, height: 0 };
  }

  try {
    const response = await fetchWithRetry(
      parentUrl,
      {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
      1,
      10000
    );

    if (!response.ok) {
      return { url: "", width: 0, height: 0 };
    }

    const text = await response.text();
    const $ = load(text);

    // 親ドメインからOGP画像を取得
    const imgUrl =
      $('meta[property="og:image"]').attr("content") ??
      $('meta[property="og:image:url"]').attr("content") ??
      $('meta[itemprop="image"]').attr("content") ??
      $('meta[name="twitter:image"]').attr("content") ??
      $('link[rel="apple-touch-icon"]').attr("href") ??
      "";

    if (imgUrl === "") {
      return { url: "", width: 0, height: 0 };
    }

    // 相対パスを絶対パスに変換
    let absoluteImgUrl = imgUrl;
    if (!imgUrl.startsWith("http")) {
      absoluteImgUrl = `${parentUrl}${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`;
    }

    return (await getImageMeta(absoluteImgUrl)).img;
  } catch {
    return { url: "", width: 0, height: 0 };
  }
};

const detectImage = async ($: CheerioAPI, url: string) => {
  const tmp =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[property="og:image:url"]').attr("content") ??
    $('meta[itemprop="image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content") ??
    $('link[rel="apple-touch-icon"]').attr("href") ??
    "";
  let imgUrl = tmp;

  if (imgUrl !== "" && !imgUrl.startsWith("http")) {
    let imgurl_minus_https = url.substring(url.indexOf("/") + 2);
    if (imgurl_minus_https.match("/")) {
      imgurl_minus_https = imgurl_minus_https.substring(0, imgurl_minus_https.indexOf("/"));
    }
    imgUrl = `${url.substring(0, url.indexOf("/"))}//${imgurl_minus_https}${imgUrl}`;
  }

  // 画像が取得できなかった場合、サブドメインなら親ドメインからフォールバック
  if (imgUrl === "" && isSubdomain(url)) {
    return await fetchImageFromParentDomain(url);
  }

  return (await getImageMeta(imgUrl)).img;
};

const detectDescription = ($: CheerioAPI) => {
  const t =
    $('meta[property="og:description"]').attr("content") ??
    $('meta[name="description"]').attr("content") ??
    "";
  return t;
};

// OGPが存在するか判定
const hasOgpMeta = ($: CheerioAPI): boolean => {
  return (
    $('meta[property="og:title"]').length > 0 ||
    $('meta[property="og:image"]').length > 0 ||
    $('meta[property="og:description"]').length > 0
  );
};

export default async function fetchMeta(url: string) {
  const cachedMetadata: Metadata | undefined = metadataCache.get(url);
  if (cachedMetadata) {
    return cachedMetadata;
  }

  const metaDataEmpty: Metadata = {
    url: url,
    title: "",
    description: "",
    image: { url: "", width: 0, height: 0 },
  };

  let fallbackMeta: Metadata | null = null;

  // ブラウザUAとbot UAの順で試行（SPAサイトはbot UAでのみOGPを返す場合がある）
  for (const headers of [BROWSER_HEADERS, BOT_HEADERS]) {
    try {
      const response = await fetchWithRetry(
        url,
        {
          headers: {
            ...headers,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        },
        2,
        15000
      );

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const $ = load(text);

      // OGPが見つかればそのまま使用
      if (hasOgpMeta($)) {
        const meta = {
          url: url,
          title: detectTitle($, url),
          description: detectDescription($),
          image: await detectImage($, url),
        };
        metadataCache.set(url, meta);
        return meta;
      }

      // OGPが無くても<title>があればフォールバック候補として保持
      if (!fallbackMeta && $("title").text().trim() !== "") {
        fallbackMeta = {
          url: url,
          title: detectTitle($, url),
          description: detectDescription($),
          image: await detectImage($, url),
        };
      }
    } catch {
      // エラーが発生しても次のUAでリトライ
    }
  }

  // OGPが取れなかった場合、<title>ベースのフォールバックがあればそれを使用
  if (fallbackMeta) {
    metadataCache.set(url, fallbackMeta);
    return fallbackMeta;
  }

  return metaDataEmpty;
}
