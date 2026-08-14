import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";
import { articles } from "@/tests/content";

describe("実データ（content/articles）", () => {
  test(`全ての記事が例外なく描画できる（${articles.length} 件）`, async () => {
    const failed: { slug: string; message: string }[] = [];

    for (const article of articles) {
      try {
        renderToStaticMarkup(toReact(await mdToHast(article.body)));
      } catch (error) {
        failed.push({ slug: article.slug, message: (error as Error).message });
      }
    }

    expect(failed).toEqual([]);
  });
});
