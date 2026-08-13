import { type CheerioAPI, load } from "cheerio";

/** HTML から読み取れるだけのメタデータ。画像は絶対 URL、無ければ空文字 */
export type ParsedMeta = {
  title: string;
  description: string;
  image: string;
  /** OGP のタグがあったか。無い場合は取得側が別の User-Agent で読み直す */
  hasOgp: boolean;
};

/** 最初に見つかった空でない値を返す。cheerio の attr は未設定で undefined、text は "" を返す */
const firstOf = (...values: (string | undefined)[]): string =>
  values.find((value) => value !== undefined && value.trim() !== "")?.trim() ?? "";

const title = ($: CheerioAPI, url: string): string =>
  firstOf(
    $('meta[property="og:title"]').attr("content"),
    $("title").text(),
    $('meta[name="title"]').attr("content"),
    url
  );

const description = ($: CheerioAPI): string =>
  firstOf(
    $('meta[property="og:description"]').attr("content"),
    $('meta[name="description"]').attr("content")
  );

/** 画像の解決順は移植元のまま。apple-touch-icon まで落ちる */
const image = ($: CheerioAPI): string =>
  firstOf(
    $('meta[property="og:image"]').attr("content"),
    $('meta[property="og:image:url"]').attr("content"),
    $('meta[itemprop="image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    $('link[rel="apple-touch-icon"]').attr("href")
  );

const hasOgp = ($: CheerioAPI): boolean =>
  ["og:title", "og:image", "og:description"].some(
    (property) => $(`meta[property="${property}"]`).length > 0
  );

/**
 * 相対参照を絶対 URL にする。
 *
 * 移植元は文字列操作で組み立てていて `../` や `?` を含む参照を壊していた。
 * URL に任せれば規格どおりに解決できる。解決できないものは捨てる。
 */
export function absoluteUrl(src: string, base: string): string {
  if (src === "") {
    return "";
  }
  try {
    return new URL(src, base).href;
  } catch {
    return "";
  }
}

/**
 * HTML からメタデータを取り出す。ネットワークもファイルも触らない。
 *
 * OGP も `<title>` も無ければ `undefined`。取得側はこれを見て
 * 「読めたが中身が無い」ページを次の User-Agent で読み直す。
 */
export function parseMeta(html: string, url: string): ParsedMeta | undefined {
  const $ = load(html);
  const ogp = hasOgp($);

  if (!ogp && $("title").text().trim() === "") {
    return undefined;
  }

  return {
    title: title($, url),
    description: description($),
    image: absoluteUrl(image($), url),
    hasOgp: ogp,
  };
}

/** ホスト名を国別 TLD ごと分解する。`co.jp` のような 2 段の TLD を 1 つとして扱う */
const SECOND_LEVEL = ["co", "com", "net", "org", "ac", "go", "ne"];

const isCountryTld = (parts: readonly string[]): boolean => {
  const [second, tld] = parts.slice(-2);
  // ccTLD は 2 文字。example.co.jp は 3 つに割れるがサブドメインではない
  return parts.length === 3 && SECOND_LEVEL.includes(second ?? "") && tld?.length === 2;
};

const hostParts = (url: string): string[] | undefined => {
  try {
    return new URL(url).hostname.split(".");
  } catch {
    return undefined;
  }
};

/** サブドメインか。`www` と `example.co.jp` は通常のドメインとして扱う */
export function isSubdomain(url: string): boolean {
  const parts = hostParts(url);
  if (!parts || parts.length <= 2 || isCountryTld(parts)) {
    return false;
  }
  return parts[0] !== "www";
}

/**
 * 親ドメインの URL。サブドメインでなければ `undefined`。
 * OGP 画像を持たないサブドメイン（`blog.example.com` など）の代わりに読む先になる
 */
export function parentDomainUrl(url: string): string | undefined {
  if (!isSubdomain(url)) {
    return undefined;
  }
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname.split(".").slice(1).join(".")}`;
}

/** カードに出す表示用の URL。ホスト名だけを見せる */
export function shortenUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
