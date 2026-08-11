import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildRoutes } from "@/routes";
import { build, loadContent, outputPath } from "./build";

const production = loadContent({ includeDrafts: false });
const dev = loadContent({ includeDrafts: true });

describe("下書きの扱い", () => {
  // ルートに現れるかどうかは buildRoutes が記事を 1:1 で写すことの帰結であり、
  // routes.test.ts が保証している。ここでは絞り込みそのものだけを見る
  test(`本番は下書きを除外する（${dev.articles.length} 件中 ${production.articles.length} 件）`, () => {
    expect(production.articles.every((article) => article.published)).toBe(true);
    expect(production.articles.length).toBeLessThan(dev.articles.length);
  });

  test("dev は下書きを残す", () => {
    const drafts = dev.articles.filter((article) => !article.published);

    expect(drafts.length).toBeGreaterThan(0);
    expect(dev.articles.length).toBe(production.articles.length + drafts.length);
  });
});

describe("出力先の対応", () => {
  test.each([
    ["/", "index.html"],
    ["/articles", "articles.html"],
    ["/articles/2", "articles/2.html"],
    ["/articles/fukui_travel", "articles/fukui_travel.html"],
    ["/artworks/tag/Dragon", "artworks/tag/Dragon.html"],
  ])("%s の出力先は %s", (routePath, expected) => {
    expect(outputPath(routePath)).toBe(expected);
  });

  test("全てのルートが一意な出力先を持つ", () => {
    const files = buildRoutes(production).map((route) => outputPath(route.path));

    expect(new Set(files).size).toBe(files.length);
  });
});

/**
 * ここから下は単体テストではなく、実際に書き出す統合テスト。
 * 手元の out/ を壊さないよう一時ディレクトリへ出力する。
 */
describe("ビルド出力", () => {
  let target = "";
  let written: string[] = [];
  let skipped: string[] = [];

  const exists = (relative: string) => fs.existsSync(path.join(target, relative));

  beforeAll(async () => {
    target = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-build-"));
    ({ written, skipped } = await build(target));
  });

  afterAll(() => {
    fs.rmSync(target, { recursive: true, force: true });
  });

  test("公開記事のページが全て出力される", () => {
    const missing = production.articles
      .map((article) => `articles/${article.slug}.html`)
      .filter((file) => !exists(file));

    expect(missing).toEqual([]);
    expect(written.length).toBe(production.articles.length);
  });

  test("下書きの記事は出力されない", () => {
    const drafts = dev.articles
      .filter((article) => !article.published)
      .map((article) => `articles/${article.slug}.html`)
      .filter((file) => exists(file));

    expect(drafts).toEqual([]);
  });

  test("未実装のページは出力されない", () => {
    // 実装が済んだらこのテストを消す。スキップが残っている間だけの検査
    expect(skipped.length).toBeGreaterThan(0);
    expect(exists("index.html")).toBe(false);
    expect(exists("articles.html")).toBe(false);
  });

  test.each(["globals.css", "favicon.ico", "robots.txt", "omemoji.png"])(
    "%s がコピーされる",
    (file) => {
      expect(exists(file)).toBe(true);
    }
  );
});
