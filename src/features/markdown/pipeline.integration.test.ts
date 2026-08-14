import { describe, expect, test } from "bun:test";

import { mdToHast } from "@/features/markdown/pipeline";
import { articles } from "@/tests/content";

describe("実データ（content/articles）", () => {
  test(`全ての記事が例外なく変換できる（${articles.length} 件）`, async () => {
    const failed: { slug: string; message: string }[] = [];

    for (const article of articles) {
      try {
        await mdToHast(article.body);
      } catch (error) {
        failed.push({ slug: article.slug, message: (error as Error).message });
      }
    }

    expect(failed).toEqual([]);
  });
});
