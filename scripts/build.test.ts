import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collectImages } from "@/features/image/assets";
import type { OptimizeResult } from "@/features/image/optimize";
import { buildRoutes } from "@/routes";
import { build, imageSources, imageVariants, loadContent, outputPath } from "./build";

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

  beforeAll(
    async () => {
      target = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-build-"));
      // キャッシュは手元・CI と共有する。変換をやり直さずに済む。
      // offline はテストをネットワークから切るため。リンクカードは取得済みの分だけ出る
      ({ written, skipped, images } = await build(target, { offline: true }));
    },
    // 画像のキャッシュが冷えていると変換に 10 秒以上かかる。既定の 5 秒では足りない。
    // しかもフックが時間切れになっても変換は走り続け、後続のテストから CPU を奪う
    120_000
  );

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

    // 変換したかキャッシュから引いたかは問わない。バリアントも含めて全て処理されていること
    const variants = imageVariants(production);
    const tasks = raster.flatMap((asset) =>
      variants.filter((variant) => variant.match?.(asset) ?? true)
    );
    expect(images.converted + images.cached).toBe(tasks.length);
  });

  test("ギャラリーの画像は切り抜き済みの小さいバリアントを指す", () => {
    const html = fs.readFileSync(path.join(target, "artworks.html"), "utf-8");
    const sources = [...html.matchAll(/<source srcset="([^"]+)"/gi)].map(
      (matched) => matched[1] ?? ""
    );

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src.endsWith(".thumb.avif"))).toBe(true);

    // 本文用を並べて CSS で切り抜くだけでは転送量が減らない。実体が小さいことを見る
    const thumb = sources[0] ?? "";
    const size = (file: string) => fs.statSync(path.join(target, file.slice(1))).size;

    expect(size(thumb)).toBeLessThan(size(thumb.replace(".thumb.avif", ".avif")));
  });

  test("本文の画像は AVIF を source に出し、寸法を付ける", () => {
    const html = fs.readFileSync(path.join(target, "articles/void_linux.html"), "utf-8");

    expect(html).toMatch(/<source srcset="[^"]+\.avif" type="image\/avif"\/?>/i);
    // レイアウトのずれ（CLS）を防ぐのが目的。マニフェストが描画まで届いていることの確認でもある
    expect(html).toMatch(/<img[^>]+width="\d+"[^>]+height="\d+"/);
    expect(html).toContain("aspect-ratio:");
  });

  test("AVIF が出る画像には必ず原寸のフォールバックが付く", () => {
    const htmlFiles = fs
      .readdirSync(target, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".html"));

    // source だけで img が無い picture は、非対応の環境で空白になる
    const orphans = htmlFiles.filter((file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      return [...html.matchAll(/<picture>(.*?)<\/picture>/gs)].some(
        (matched) => !matched[1]?.includes("<img")
      );
    });

    expect(orphans).toEqual([]);
  });

  test("HTML 内のルート絶対な参照が全て実ファイルに解決する", () => {
    const htmlFiles = fs
      .readdirSync(target, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".html"));

    const broken = htmlFiles.flatMap((file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      return (
        // srcset も見る。picture の source が壊れていても img で表示されてしまい気付けない。
        // React が source の属性を srcSet と大文字混じりで書き出すため i を付ける
        [...html.matchAll(/(?:src|href|srcset)="(\/[^"]+)"/gi)]
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
