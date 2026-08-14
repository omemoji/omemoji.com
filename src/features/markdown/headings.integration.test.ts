import { describe, expect, test } from "bun:test";

import { collectHeadings } from "@/features/markdown/headings";
import { mdToHast } from "@/features/markdown/pipeline";
import { articles } from "@/tests/content";

const toc = async (markdown: string) => collectHeadings(await mdToHast(markdown));

describe("実データ（content/articles）", () => {
  test("全ての見出しが slug と text を持つ", async () => {
    const broken: { slug: string; heading: unknown }[] = [];

    for (const article of articles) {
      for (const heading of await toc(article.body)) {
        if (!heading.slug || !heading.text) broken.push({ slug: article.slug, heading });
      }
    }

    expect(broken).toEqual([]);
  });

  test("目次が h3 までに収まっている", async () => {
    const tooDeep: number[] = [];

    for (const article of articles) {
      for (const heading of await toc(article.body)) {
        if (heading.depth > 3) tooDeep.push(heading.depth);
      }
    }

    expect(tooDeep).toEqual([]);
  });
});
