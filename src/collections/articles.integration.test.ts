import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import { articleSchema } from "@/collections/articles";
import { articles, articlesDir as baseDir } from "@/tests/content";

// 落ちたら記事の書き方を直す
describe("実データ（content/articles）", () => {
  test("記事が 1 件以上ある", () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  test("slug がサイト全体で一意である", () => {
    const slugs = articles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("配置されたディレクトリの年月と date が全ての記事で一致する", () => {
    const mismatched = fs
      .readdirSync(baseDir, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".md"))
      .map((file) => {
        const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");
        const { date } = articleSchema.parse(
          parseYaml(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "")
        );
        // yaml は日付のみの値を UTC 深夜として解釈するため UTC で取り出す
        const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
        return {
          file,
          expected: `${date.getUTCFullYear()}/${month}`,
          actual: file.split(path.sep).slice(0, 2).join("/"),
        };
      })
      .filter(({ expected, actual }) => actual !== expected);

    // 不一致を全件まとめて報告する（1件ずつ落ちると残りが見えないため）
    expect(mismatched).toEqual([]);
  });

  test("全ての記事の body が空でない", () => {
    const empty = articles
      .filter((article) => article.body.trim() === "")
      .map((article) => article.slug);
    expect(empty).toEqual([]);
  });
});
