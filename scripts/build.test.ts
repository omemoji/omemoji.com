import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collectImages } from "@/features/image/assets";
import type { OptimizeResult } from "@/features/image/optimize";
import { buildRoutes } from "@/routes";
import { build, imageSources, loadContent, outputPath } from "./build";

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
  let images: OptimizeResult;

  const exists = (relative: string) => fs.existsSync(path.join(target, relative));

  beforeAll(async () => {
    target = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-build-"));
    // キャッシュは手元・CI と共有する。変換をやり直さずに済む
    ({ written, skipped, images } = await build(target));
  });

  afterAll(() => {
    fs.rmSync(target, { recursive: true, force: true });
  });

  test("全てのルートが出力される", () => {
    const missing = buildRoutes(production)
      .map((route) => outputPath(route.path))
      .filter((file) => !exists(file));

    expect(missing).toEqual([]);
    // スキップされるページが無くなったこと自体を検査する
    expect(skipped).toEqual([]);
    expect(written.length).toBe(buildRoutes(production).length);
  });

  test.each(["index.html", "404.html", "articles.html", "artworks.html"])(
    "%s が出力される",
    (file) => {
      expect(exists(file)).toBe(true);
    }
  );

  test("下書きの記事は出力されない", () => {
    const drafts = dev.articles
      .filter((article) => !article.published)
      .map((article) => `articles/${article.slug}.html`)
      .filter((file) => exists(file));

    expect(drafts).toEqual([]);
  });

  test("コンテンツの画像が記事・作品ごとに分かれて出力される", () => {
    const images = collectImages(imageSources(production));
    const missing = images.map(({ to }) => to).filter((file) => !exists(file));

    expect(missing).toEqual([]);
    // 平置きなら同名で潰れる。名前空間が効いていることを出力先の一意性で見る
    expect(new Set(images.map(({ to }) => to)).size).toBe(images.length);
  });

  test("全ての画像が AVIF として出力される", () => {
    const raster = collectImages(imageSources(production)).filter(({ from }) =>
      /\.(png|jpe?g|webp|avif)$/i.test(from)
    );
    const missing = raster
      .map(({ to }) => to.replace(/\.[^.]+$/, ".avif"))
      .filter((file) => !exists(file));

    expect(missing).toEqual([]);
    // 変換したかキャッシュから引いたかは問わない。全枚数が処理されていること
    expect(images.converted + images.cached).toBe(raster.length);
  });

  test("本文の画像に寸法が付く", () => {
    const html = fs.readFileSync(path.join(target, "articles/void_linux.html"), "utf-8");

    // レイアウトのずれ（CLS）を防ぐのが目的。マニフェストが描画まで届いていることの確認でもある
    expect(html).toMatch(/<img[^>]+\.avif"[^>]+width="\d+"[^>]+height="\d+"/);
    expect(html).toContain("aspect-ratio:");
  });

  test("HTML 内のルート絶対な参照が全て実ファイルに解決する", () => {
    const htmlFiles = fs
      .readdirSync(target, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".html"));

    const broken = htmlFiles.flatMap((file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      return (
        [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)]
          .map((matched) => decodeURIComponent(matched[1] ?? ""))
          // 拡張子を持つものだけを対象にする。ページへのリンクは別の検査
          .filter((href) => path.extname(href) !== "" && !exists(href.slice(1)))
          .map((href) => ({ file, href }))
      );
    });

    expect(broken).toEqual([]);
  });

  test.each(["globals.css", "favicon.ico", "robots.txt", "omemoji.png"])(
    "%s がコピーされる",
    (file) => {
      expect(exists(file)).toBe(true);
    }
  );
});
