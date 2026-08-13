import { absoluteUrl, parentDomainUrl, parseMeta } from "@/features/link-card/parse";

/** 取得できたメタデータ。画像は取得先の絶対 URL。サムネイル化はこの後段の責務 */
export type LinkMeta = {
  url: string;
  title: string;
  description: string;
  image: string;
};

/** `globalThis.fetch` と同じ形。テストはここに差し替えを渡し、実ネットワークを使わない */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export type FetchMetaOptions = {
  fetch?: Fetcher;
  /** 5xx とネットワークエラーの再試行回数 */
  retries?: number;
  /** 線形バックオフの単位。テストは 0 を渡す */
  retryDelayMs?: number;
  timeoutMs?: number;
};

// 環境をまたいで同じ結果を得るためブラウザ相当のヘッダを送る
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
// SPA は bot にだけ OGP を返すことがある。ブラウザ UA で読めなかったときの 2 段目
const BOT_UA = "Discordbot/2.0";

const ACCEPT_HTML = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

const headers = (ua: string) => ({
  "User-Agent": ua,
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
  Accept: ACCEPT_HTML,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 5xx とネットワークエラー・タイムアウトを再試行する。
 *
 * 動的に生成される OGP 画像は初回だけ失敗することがある。
 * 4xx は再試行しても変わらないのでそのまま返す。
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { fetch: fetcher = fetch, retries = 2, retryDelayMs = 1000, timeoutMs = 15000 }: FetchMetaOptions
): Promise<Response | undefined> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0 && retryDelayMs > 0) {
      await sleep(retryDelayMs * attempt);
    }
    try {
      const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok || response.status < 500) {
        return response;
      }
    } catch {
      // ネットワークエラーとタイムアウト。次の周回で再試行する
    }
  }
  return undefined;
}

async function fetchHtml(
  url: string,
  ua: string,
  options: FetchMetaOptions
): Promise<string | undefined> {
  const response = await fetchWithRetry(url, { headers: headers(ua) }, options);
  if (!response?.ok) {
    return undefined;
  }
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}

/**
 * サブドメインで画像が取れなかったときに、親ドメインの OGP 画像で代用する。
 *
 * `blog.example.com` の記事ページに画像が無くても `example.com` にはあることが多く、
 * カードが空になるより見た目が保てる。
 */
async function imageFromParentDomain(
  url: string,
  options: FetchMetaOptions
): Promise<string | undefined> {
  const parent = parentDomainUrl(url);
  if (!parent) {
    return undefined;
  }
  // 本命ではないので待ち時間を短くする
  const html = await fetchHtml(parent, BROWSER_UA, { ...options, retries: 1, timeoutMs: 10000 });
  const meta = html === undefined ? undefined : parseMeta(html, parent);
  return meta?.image === "" ? undefined : meta?.image;
}

/**
 * リンク先のメタデータを取得する。**この関数だけがネットワークを触る。**
 *
 * `fetch` を差し替えられるようにしてあるため、分岐のテストは実ネットワーク無しで書ける。
 * 全て失敗した場合は `undefined` を返す。呼び出し側は素のリンクへ倒す
 */
export async function fetchMeta(
  url: string,
  options: FetchMetaOptions = {}
): Promise<LinkMeta | undefined> {
  let fallback: LinkMeta | undefined;

  for (const ua of [BROWSER_UA, BOT_UA]) {
    const html = await fetchHtml(url, ua, options);
    if (html === undefined) {
      continue;
    }

    const parsed = parseMeta(html, url);
    if (!parsed) {
      continue;
    }

    const image =
      parsed.image === "" ? ((await imageFromParentDomain(url, options)) ?? "") : parsed.image;
    const meta: LinkMeta = {
      url,
      title: parsed.title,
      description: parsed.description,
      image: absoluteUrl(image, url),
    };

    if (parsed.hasOgp) {
      return meta;
    }
    // OGP が無いページ。<title> だけの結果を控えに置き、bot の UA でもう一度読む
    fallback ??= meta;
  }

  return fallback;
}

export default fetchMeta;
