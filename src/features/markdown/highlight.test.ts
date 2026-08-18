import { describe, expect, test } from "bun:test";
import { toHtml } from "hast-util-to-html";

import { codeScript, codeStyles, getRenderer, hasCode } from "@/features/markdown/highlight";
import { mdToHast } from "@/features/markdown/pipeline";

const render = async (markdown: string): Promise<string> => toHtml(await mdToHast(markdown));

/** expressive-code を通る最小の入力 */
const withCode = "```ts title=a.ts\nconst a = 1;\n```";

const colorsIn = (html: string): number =>
  new Set([...html.matchAll(/--0:(#[0-9a-fA-F]{6})/g)].map(([, color]) => color)).size;

describe("コードブロックの描画", () => {
  test("構文がハイライトされる", async () => {
    expect(colorsIn(await render("```sh\nsudo xbps-install -S\n```"))).toBeGreaterThan(1);
  });

  test("言語がわからない場合も例外にならない", async () => {
    expect(await render("```\nただの文字列\n```")).toContain("ただの文字列");
  });
});

describe("defaultProps", () => {
  test("行番号は既定で出さない", async () => {
    expect(await render("```sh\necho 1\n```")).not.toContain("gutter");
  });

  test("行番号は明示すれば出る", async () => {
    expect(await render("```sh showLineNumbers\necho 1\n```")).toContain("gutter");
  });

  test("30 行を超える部分は折りたたむ", async () => {
    const long = `\`\`\`sh\n${[...Array(40)].map((_, i) => `echo ${i}`).join("\n")}\n\`\`\``;
    expect(await render(long)).toContain("<details");
  });

  test("30 行以内は折りたたまない", async () => {
    expect(await render("```sh\necho 1\n```")).not.toContain("<details");
  });
});

describe("共通ファイルへ追い出した資産", () => {
  test("CSS に styleOverrides が反映されている", async () => {
    const css = await codeStyles();

    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain("var(--border)");
    expect(css).toContain("--ec-frm-frameBoxShdCssVal:none");
  });

  test("クライアント側のスクリプトを 1 つに束ねて取り出せる", async () => {
    const js = await codeScript();

    expect(js.length).toBeGreaterThan(0);
    // 各モジュールは自己完結した形で閉じている。束ねても名前が衝突しない根拠
    expect(js).toStartWith("try{");
  });

  test("レンダラは 1 度しか構築されない", () => {
    // Shiki の初期化は重いため、記事ごとに作り直してはいけない
    expect(getRenderer()).toBe(getRenderer());
  });
});

/**
 * 記事ごとの複製を止めたことの回帰テスト。
 *
 * rehype-expressive-code は既定で「コードブロックを含む文書ごと」に
 * CSS 24 KB・JS 2.5 KB を差し込む。中身は全ページ同一なので、
 * 戻るとブラウザキャッシュが効かないまま HTML が倍近くに膨らむ
 */
describe("ページへの複製", () => {
  test("CSS はページに差し込まれない", async () => {
    const html = await render(withCode);

    expect(html).toContain("expressive-code");
    expect(html).not.toContain("<style>");
    expect(await codeStyles()).not.toBe("");
  });

  test("JS はページに差し込まれない", async () => {
    expect(await render(withCode)).not.toContain("<script");
    expect(await codeScript()).not.toBe("");
  });
});

describe("読み込みの判定", () => {
  test("コードブロックがあれば true", async () => {
    expect(hasCode(await mdToHast(withCode))).toBe(true);
  });

  test("インラインコードだけなら false", async () => {
    // `code` 要素は出るが expressive-code は通らないため、CSS も JS も要らない
    expect(hasCode(await mdToHast("これは `inline` です"))).toBe(false);
  });

  test("コードブロックが無ければ false", async () => {
    expect(hasCode(await mdToHast("ただの段落"))).toBe(false);
  });
});
