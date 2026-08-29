import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { errorPage, fileResponse, linkCardUrls, normalize } from "./dev";

const rootDir = path.join(import.meta.dirname, "..");

/**
 * 立ち上げは `import.meta.main` で守る（build.ts・gen-schema.ts と同じ）。
 *
 * ガードが無いと **import しただけでポートを掴み、監視スレッドが走り、
 * `setAnalyticsEnabled(false)` が全テストへ漏れる**。同じプロセスの中では
 * 既に起きた後なので、別プロセスで import だけを行って確かめる
 */
describe("実行ガード", () => {
  test("import しただけではサーバを立てない", () => {
    const imported = Bun.spawnSync(["bun", "-e", 'await import("./scripts/dev.ts")'], {
      cwd: rootDir,
      env: { ...process.env, PORT: "0" },
    });

    expect(imported.exitCode).toBe(0);
    // 立ち上がっていれば起動の一行が出て、そもそも終了しない
    expect(imported.stdout.toString()).not.toContain("dev server:");
  });

  test("import しただけでは計測タグの設定を触らない", () => {
    // dev は計測を切る。これが import で漏れると、GA を検査する側が巻き添えで落ちる
    const probe = `
      await import("./scripts/dev.ts");
      const { default: Analytics } = await import("./src/components/Analytics.tsx");
      const { renderToStaticMarkup } = await import("react-dom/server");
      console.log(renderToStaticMarkup(Analytics({})) === "" ? "disabled" : "enabled");
    `;
    const imported = Bun.spawnSync(["bun", "-e", probe], { cwd: rootDir });

    expect(imported.stdout.toString().trim()).toBe("enabled");
  });
});

describe("normalize", () => {
  test.each([
    // 本番の出力と同じ形でも引ける
    ["/articles/void_linux.html", "/articles/void_linux"],
    ["/articles/void_linux", "/articles/void_linux"],
    // 末尾スラッシュはどれだけ付いていても落とす
    ["/articles/", "/articles"],
    ["/articles///", "/articles"],
    // 落とし切って空になるのはルート。"" は routes.ts に無い
    ["/", "/"],
    ["///", "/"],
    ["/index.html", "/index"],
  ])("%s → %s", (pathname, expected) => {
    expect(normalize(pathname)).toBe(expected);
  });

  test("途中の .html は落とさない", () => {
    // 末尾にアンカーしていないと、こういう slug が壊れる
    expect(normalize("/articles/a.html.b")).toBe("/articles/a.html.b");
  });
});

describe("fileResponse", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-dev-"));
  const root = path.join(dir, "public");

  fs.mkdirSync(path.join(root, "sub"), { recursive: true });
  fs.writeFileSync(path.join(root, "a.txt"), "a");
  fs.writeFileSync(path.join(dir, "secret.txt"), "secret");

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("根の中の実ファイルは返す", async () => {
    const response = fileResponse(path.join(root, "a.txt"), root);

    expect(await response?.text()).toBe("a");
  });

  test("根の外へ出る参照は返さない", () => {
    // 相対参照を含む URL がここまで来ても、根の外は読ませない
    expect(fileResponse(path.join(root, "../secret.txt"), root)).toBeUndefined();
    expect(fileResponse(path.join(dir, "secret.txt"), root)).toBeUndefined();
  });

  test("存在しないファイルは返さない", () => {
    expect(fileResponse(path.join(root, "none.txt"), root)).toBeUndefined();
  });

  test("ディレクトリは返さない", () => {
    // Bun.file にディレクトリを渡すと、読み出しの時点で失敗する
    expect(fileResponse(path.join(root, "sub"), root)).toBeUndefined();
  });
});

/**
 * 収集は Markdown の再パースで、実測 79ms とリクエストの固定費として重い。
 * 本文が変わらない限り結果も変わらないため、本文そのものを鍵にして覚える
 */
describe("linkCardUrls", () => {
  const bodies = ["https://example.com/a\n", "本文だけ\n"];

  test("本文が同じなら覚えた結果を返す", () => {
    const first = linkCardUrls(bodies);
    const second = linkCardUrls([...bodies]);

    expect(first).toEqual(["https://example.com/a"]);
    // 参照が同じ = 再パースしていない。値の一致だけでは区別が付かない
    expect(second).toBe(first);
  });

  test("本文が変われば集め直す", () => {
    const first = linkCardUrls(bodies);
    const changed = linkCardUrls([...bodies, "https://example.com/b\n"]);

    expect(changed).not.toBe(first);
    expect(changed).toEqual(["https://example.com/a", "https://example.com/b"]);
  });

  test("本文の並びが変われば集め直す", () => {
    // 記事が 1 本増減しただけでも順序は動く。連結を鍵にしているので取り違えない
    expect(linkCardUrls(["a", "b"])).not.toBe(linkCardUrls(["b", "a"]));
  });
});

describe("errorPage", () => {
  /** errorPage はサーバのログにも出す。テストの出力を埋めないよう捨てる */
  const quiet = <T>(body: () => T): T => {
    const original = console.error;
    console.error = () => {};
    try {
      return body();
    } finally {
      console.error = original;
    }
  };

  test("500 とスタックを返す", async () => {
    const response = quiet(() => errorPage(new Error("壊れた")));
    const html = await response.text();

    expect(response.status).toBe(500);
    expect(html).toContain("500 描画に失敗しました");
    expect(html).toContain("壊れた");
    // 直したら勝手に読み直せるよう、エラー画面にも差し込む
    expect(html).toContain("<script");
  });

  test("例外の中身を HTML として解釈させない", () => {
    // frontmatter の書き損じがそのまま出る。<script> を含む本文で画面が壊れてはいけない
    const response = quiet(() => errorPage(new Error("<script>alert(1)</script>")));

    expect(response.status).toBe(500);
    return expect(response.text()).resolves.not.toContain("<script>alert(1)</script>");
  });

  test("Error でないものも文字列にして出す", async () => {
    expect(await quiet(() => errorPage("ただの文字列")).text()).toContain("ただの文字列");
  });

  test("cause があれば併せて出す", async () => {
    // zod の検証エラーは cause にファイル名を持つことがある
    const html = await quiet(() => errorPage(new Error("外側", { cause: "内側の理由" }))).text();

    expect(html).toContain("cause");
    expect(html).toContain("内側の理由");
  });
});
