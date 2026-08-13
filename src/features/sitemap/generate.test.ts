import { describe, expect, test } from "bun:test";

import { buildSitemap } from "@/features/sitemap/generate";

const locs = (xml: string): string[] =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((matched) => matched[1] ?? "");

describe("buildSitemap", () => {
  test("urlset として組み立てる", () => {
    const xml = buildSitemap([{ path: "/" }], "omemoji.com");

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  test("canonical と同じ絶対 URL を出す", () => {
    const xml = buildSitemap([{ path: "/" }, { path: "/articles" }], "omemoji.com");

    expect(locs(xml)).toEqual(["https://omemoji.com/", "https://omemoji.com/articles"]);
  });

  test("更新日は日付だけを出す。持たないページには付けない", () => {
    const xml = buildSitemap(
      [{ path: "/articles/x", lastmod: new Date("2024-03-05") }, { path: "/articles" }],
      "omemoji.com"
    );

    expect(xml).toContain("<lastmod>2024-03-05</lastmod>");
    expect([...xml.matchAll(/<lastmod>/g)]).toHaveLength(1);
  });

  test("URL に使えない文字はエスケープする", () => {
    // タグ名に日本語が入る URL は収録しないが、記事の slug は自由に付けられる
    const xml = buildSitemap([{ path: "/articles/あ&い" }], "omemoji.com");

    expect(xml).toContain("https://omemoji.com/articles/%E3%81%82&amp;%E3%81%84");
    expect(xml).not.toContain("&い");
  });

  test("0 件でも壊れない", () => {
    expect(locs(buildSitemap([], "omemoji.com"))).toEqual([]);
  });
});
