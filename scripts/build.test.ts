import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CODE_ASSETS } from "@/config";
import type { Route } from "@/routes";
import {
  type BuildResult,
  copyFiles,
  outputPath,
  renderRoute,
  renderRoutes,
  reportBuild,
  writeCodeAssets,
} from "./build";

// 実データを読み込む検査と、実際に書き出す検査は build.integration.test.ts にある
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
});

/** pages に無いページを指すルート。実装を消した状態を型を曲げて作る */
const unimplemented = (routePath: string): Route =>
  ({ path: routePath, indexable: false, page: "MissingPage" }) as unknown as Route;

describe("ルートの描画", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-render-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("未実装のページは undefined を返す", async () => {
    expect(await renderRoute(unimplemented("/none"))).toBeUndefined();
  });

  test("実装のあるページは doctype 付きの HTML になる", async () => {
    const html = await renderRoute({ path: "/404", indexable: false, page: "NotFoundPage" });

    expect(html).toStartWith("<!doctype html>");
  });

  test("描いたページを出力先へ書き出す", async () => {
    const { written, skipped } = await renderRoutes(dir, [
      { path: "/404", indexable: false, page: "NotFoundPage" },
    ]);

    expect(written).toEqual(["404.html"]);
    expect(skipped).toEqual([]);
    expect(fs.readFileSync(path.join(dir, "404.html"), "utf-8")).toStartWith("<!doctype html>");
  });

  test("未実装のページは書き出さず skipped に落ちる", async () => {
    // ビルドは落とさない。何が出なかったかは CLI が最後にまとめて出す
    const { written, skipped } = await renderRoutes(dir, [
      unimplemented("/none"),
      { path: "/404", indexable: false, page: "NotFoundPage" },
    ]);

    expect(written).toEqual(["404.html"]);
    expect(skipped).toEqual(["MissingPage" as Route["page"]]);
    expect(fs.existsSync(path.join(dir, "none.html"))).toBe(false);
  });
});

describe("複製", () => {
  let dir = "";
  const src = () => path.join(dir, "src");
  const target = () => path.join(dir, "out");

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-copy-"));
    fs.mkdirSync(path.join(src(), "fonts"), { recursive: true });
    fs.writeFileSync(path.join(src(), "fonts/a.woff2"), "woff2");
    fs.writeFileSync(path.join(src(), "fonts/a.ttf"), "ttf");
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("複製元が無いものは黙って飛ばす", () => {
    const copied = copyFiles(target(), [
      { from: path.join(src(), "none.css"), to: "none.css" },
      { from: path.join(src(), "fonts/a.woff2"), to: "fonts/a.woff2" },
    ]);

    expect(copied).toEqual(["fonts/a.woff2"]);
    expect(fs.existsSync(path.join(target(), "none.css"))).toBe(false);
  });

  test("filter を渡すと選んだものだけを複製する", () => {
    const copied = copyFiles(target(), [
      {
        from: path.join(src(), "fonts"),
        to: "fonts",
        filter: (from) => fs.statSync(from).isDirectory() || from.endsWith(".woff2"),
      },
    ]);

    expect(copied).toEqual(["fonts"]);
    expect(fs.readdirSync(path.join(target(), "fonts"))).toEqual(["a.woff2"]);
  });
});

/**
 * コードブロックの CSS と JS。**複製ではなく生成する**ため、複製の検査とは別に見る。
 * Layout はこの 2 つを固定の URL で読むので、名前が変わると静かにリンク切れになる
 */
describe("コードブロックの資産", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-code-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("CSS と JS を書き出す", async () => {
    expect(await writeCodeAssets(dir)).toEqual([CODE_ASSETS.css, CODE_ASSETS.js]);

    expect(fs.readFileSync(path.join(dir, CODE_ASSETS.css), "utf-8")).toContain("expressive-code");
    expect(fs.readFileSync(path.join(dir, CODE_ASSETS.js), "utf-8").length).toBeGreaterThan(0);
  });
});

describe("CLI の表示", () => {
  const result = (over: Partial<BuildResult> = {}): BuildResult => ({
    written: ["index.html"],
    skipped: [],
    images: { manifest: {}, converted: 1, cached: 2, passthrough: 3 },
    links: { manifest: {}, fetched: 4, cached: 5, failed: [] },
    og: { manifest: {}, generated: 6, cached: 7 },
    ...over,
  });

  /** console.log を捉える。差し替えは必ず戻す */
  const lines = (body: () => void): string[] => {
    const captured: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.join(" "));
    };
    try {
      body();
    } finally {
      console.log = original;
    }
    return captured;
  };

  test("枚数の内訳を出す", () => {
    const output = lines(() => reportBuild(result())).join("\n");

    expect(output).toContain("built 1 pages");
    expect(output).toContain("images: 1 converted, 2 cached, 3 as-is");
    expect(output).toContain("link cards: 4 fetched, 5 cached");
    expect(output).toContain("og images: 6 generated, 7 cached");
  });

  test("何も欠けていなければ内訳だけで終わる", () => {
    expect(lines(() => reportBuild(result()))).toHaveLength(4);
  });

  test("カードにならなかった URL を並べる", () => {
    const output = lines(() =>
      reportBuild(
        result({
          links: { manifest: {}, fetched: 0, cached: 0, failed: ["https://example.com/a"] },
        })
      )
    ).join("\n");

    // ページ自体は出ている。素のリンクとして描画されたことが分かる文言にする
    expect(output).toContain("rendered as plain links");
    expect(output).toContain("https://example.com/a");
  });

  test("未実装のページはページ名ごとに数える", () => {
    const skipped = ["ArticlePage", "ArticlePage", "AboutPage"] as Route["page"][];
    const output = lines(() => reportBuild(result({ skipped }))).join("\n");

    expect(output).toContain("skipped 3 routes");
    expect(output).toContain("ArticlePage(2) AboutPage(1)");
  });
});
