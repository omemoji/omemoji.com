import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { articleSchema, loadArticles } from "@/collections/articles";
import { TAGS } from "@/collections/tags";

// 実データ（content/articles）の検査は articles.integration.test.ts にある

/**
 * フィクスチャに使う、確実に登録済みのタグ。
 * 特定のタグ名を書くと、そのタグを TAGS から消しただけでフィクスチャが不正になり、
 * 正常系は落ち、異常系は誤った理由で通ってしまう
 */
const registeredTag = TAGS[0];

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
    expect(articleSchema.safeParse({ ...valid, tags: [registeredTag] }).success).toBe(true);
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
  tags: `["${registeredTag}"]`,
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
