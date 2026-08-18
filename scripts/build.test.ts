import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CODE_ASSETS, KATEX_CSS, STYLESHEET } from "@/config";
import type { Route } from "@/routes";
import {
  type BuildResult,
  buildHeaders,
  copyFiles,
  fingerprinted,
  outputPath,
  renderRoute,
  renderRoutes,
  reportBuild,
  siteStyles,
  writeAssets,
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

describe("指紋", () => {
  test.each([
    ["globals.css", "globals."],
    ["code.js", "code."],
    ["katex/katex.min.css", "katex/katex.min."],
  ])("%s は拡張子の手前に指紋を挟む", (name, prefix) => {
    const file = fingerprinted(name, "body{}");

    expect(file).toStartWith(prefix);
    expect(file).toEndWith(path.extname(name));
    // ディレクトリは変えない。CSS からフォントへの相対参照が壊れるため
    expect(path.dirname(file)).toBe(path.dirname(name));
  });

  test("内容が変われば名前も変わる", () => {
    expect(fingerprinted("a.css", "body{}")).not.toBe(fingerprinted("a.css", "body{ }"));
  });

  test("内容が同じなら名前も同じ", () => {
    // 変更の無いデプロイでキャッシュを捨てさせない
    expect(fingerprinted("a.css", "body{}")).toBe(fingerprinted("a.css", "body{}"));
  });
});

/**
 * 指紋付きの資産。**複製ではなく生成する**ため、複製の検査とは別に見る。
 * 読む側（Layout）はマニフェスト越しに引くので、名前の綴りは表に出ない
 */
describe("資産の書き出し", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-assets-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("論理名から指紋付きの URL への対応表を返す", async () => {
    const manifest = await writeAssets(dir);

    expect(Object.keys(manifest).sort()).toEqual(
      [STYLESHEET, KATEX_CSS, CODE_ASSETS.css, CODE_ASSETS.js].sort()
    );
    // 論理名そのままの URL は返さない。返すと指紋を付けた意味が無い
    expect(Object.entries(manifest).every(([name, url]) => url !== `/${name}`)).toBe(true);
  });

  test("対応表の URL が全て実ファイルとして存在する", async () => {
    const manifest = await writeAssets(dir);
    const missing = Object.values(manifest).filter(
      (url) => !fs.existsSync(path.join(dir, url.slice(1)))
    );

    expect(missing).toEqual([]);
    expect(
      fs.readFileSync(path.join(dir, manifest[CODE_ASSETS.css]?.slice(1) ?? ""), "utf-8")
    ).toContain("expressive-code");
  });

  test("指紋を付けない名前では出さない", async () => {
    // 原本も置くと指紋なしの URL でも取れてしまい、恒久キャッシュが嘘になる
    await writeAssets(dir);

    expect(fs.existsSync(path.join(dir, STYLESHEET))).toBe(false);
    expect(fs.existsSync(path.join(dir, CODE_ASSETS.css))).toBe(false);
  });

  test("CSS は縮めて書き出す", async () => {
    const minified = await siteStyles();
    const original = fs.readFileSync(
      path.join(import.meta.dirname, "../src/styles/globals.css"),
      "utf-8"
    );

    expect(minified.length).toBeLessThan(original.length);
    // 縮めても層の宣言は先頭に残る。壊れていないことの最低限の確認
    expect(minified).toStartWith("@layer reset,tokens,base,content,components;");
  });
});

describe("ヘッダ設定", () => {
  test("対応表の URL だけを恒久キャッシュにする", () => {
    const headers = buildHeaders({ "a.css": "/a.deadbeef.css", "b.js": "/b.cafebabe.js" });

    expect(headers).toContain(
      "/a.deadbeef.css\n  Cache-Control: public, max-age=31536000, immutable"
    );
    expect(headers).toContain(
      "/b.cafebabe.js\n  Cache-Control: public, max-age=31536000, immutable"
    );
    // 指紋の無い名前は載せない。内容が変わっても URL が変わらないため
    expect(headers).not.toContain("/a.css");
  });
});

describe("CLI の表示", () => {
  const result = (over: Partial<BuildResult> = {}): BuildResult => ({
    written: ["index.html"],
    skipped: [],
    images: { manifest: {}, converted: 1, cached: 2, passthrough: 3 },
    links: { manifest: {}, fetched: 4, cached: 5, failed: [] },
    og: { manifest: {}, generated: 6, cached: 7 },
    assets: {},
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
