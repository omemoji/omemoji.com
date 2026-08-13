/**
 * サイトマップに載せる 1 ページ。
 *
 * ルートそのものではなく最小限の形で受け取る。`features/**` は `routes.ts` を
 * import しない規則があり、収録するかどうかの判断（`indexable`）も
 * ルート側の責務として切り離してある
 */
export type SitemapEntry = {
  /** 先頭が `/` のルートパス */
  path: string;
  /** 更新日。詳細ページだけが持つ */
  lastmod?: Date;
};

/** XML のテキストとして安全にする。属性は使わないので 3 文字で足りる */
const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * `loc` に入れる絶対 URL。
 *
 * `Layout` の `canonical` と同じ組み立てにする。食い違うと、検索エンジンには
 * 「サイトマップに載っている URL」と「正規 URL」が別物に見える
 */
const locUrl = (host: string, path: string): string =>
  escapeXml(`https://${host}${encodeURI(path)}`);

/** W3C Datetime の日付部分。sitemaps.org が推す形式 */
const lastmodValue = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * サイトマップ XML を組み立てる。I/O を持たない純粋な関数。
 *
 * 収録するページは呼び出し側が選ぶ（`routes().filter((r) => r.indexable)`）。
 * ここで再度フィルタすると、収録ルールが 2 か所に分かれて食い違う
 */
export function buildSitemap(entries: SitemapEntry[], host: string): string {
  const urls = entries.map(({ path, lastmod }) => {
    const tags = [`<loc>${locUrl(host, path)}</loc>`];
    if (lastmod) {
      tags.push(`<lastmod>${lastmodValue(lastmod)}</lastmod>`);
    }
    return `  <url>\n${tags.map((tag) => `    ${tag}`).join("\n")}\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
