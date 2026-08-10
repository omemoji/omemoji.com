import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import { articleSchema, loadArticles } from "@/content/articles";

const baseDir = path.join(import.meta.dirname, "../../content/articles");
const articles = loadArticles(baseDir);

// 落ちたら記事の書き方を直す
describe("実データ（content/articles）", () => {
  test(`全ての記事がスキーマを通る（${articles.length} 件）`, () => {
    // loadArticles は検証に失敗した時点で throw するため、ここまで来れば全件通っている
    expect(articles.length).toBeGreaterThan(0);
  });

  test("slug がサイト全体で一意である", () => {
    const slugs = articles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("日付の降順に並んでいる", () => {
    const dates = articles.map((article) => article.date.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
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

// 以下は落ちたらコードを直す
describe("articleSchema", () => {
  test("一覧に無いタグは受け付けない", () => {
    const valid = {
      emoji: "🤖",
      title: "Test",
      description: "テスト",
      date: "2026-01-01",
      published: false,
    };
    expect(articleSchema.safeParse({ ...valid, tags: ["Tech"] }).success).toBe(true);
    expect(articleSchema.safeParse({ ...valid, tags: ["NotARegisteredTag"] }).success).toBe(false);
  });
});

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** 記事 1 本だけを含む一時ディレクトリを作り、その baseDir を返す */
const fixture = (markdown: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "articles-"));
  tempDirs.push(dir);

  const articleDir = path.join(dir, "2026", "01", "sample");
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(path.join(articleDir, "sample.md"), markdown);

  return dir;
};

const validFrontmatter = {
  emoji: '"🤖"',
  title: '"サンプル"',
  description: '"異常系テスト用"',
  date: "2026-01-15",
  tags: '["Tech"]',
  published: "true",
};

/** 既定の frontmatter を上書き（null で削除）して Markdown を組み立てる */
const markdown = (
  overrides: Partial<Record<keyof typeof validFrontmatter, string | null>> = {}
): string => {
  const lines = Object.entries({ ...validFrontmatter, ...overrides })
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key}: ${value}`);

  return `---\n${lines.join("\n")}\n---\n\n## 本文\n`;
};

describe("loadArticles の異常系", () => {
  test("フィクスチャ自体は正常に読める", () => {
    // 以下の異常系が「常に throw する作り」になっていないことの対照実験
    const loaded = loadArticles(fixture(markdown()));

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.slug).toBe("sample");
  });

  test.each([
    ["frontmatter が無い", "## 本文だけの記事\n"],
    ["frontmatter が閉じられていない", '---\ntitle: "閉じ忘れ"\n\n## 本文\n'],
  ])("%s と throw する", (_label, source) => {
    expect(() => loadArticles(fixture(source))).toThrow(/Frontmatter not found/);
  });

  test.each([
    ["未登録のタグ", { tags: '["NotARegisteredTag"]' }],
    ["日付の書式違反", { date: "2026/01/15" }],
    ["存在しない日付", { date: "2026-02-30" }],
    ["必須フィールドの欠落", { title: null }],
    ["型の不一致", { published: '"yes"' }],
  ])("%s は throw する", (_label, overrides) => {
    expect(() => loadArticles(fixture(markdown(overrides)))).toThrow(/Invalid frontmatter/);
  });

  test("エラーメッセージに該当ファイルのパスが含まれる", () => {
    // 記事が増えたときに、どのファイルが原因か特定できる必要がある
    expect(() => loadArticles(fixture(markdown({ title: null })))).toThrow(
      path.join("2026", "01", "sample", "sample.md")
    );
  });
});
