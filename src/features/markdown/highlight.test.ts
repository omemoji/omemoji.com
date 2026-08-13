import { describe, expect, test } from "bun:test";
import { toHtml } from "hast-util-to-html";

import { codeScripts, codeStyles, getRenderer } from "@/features/markdown/highlight";
import { mdToHast } from "@/features/markdown/pipeline";

/** expressive-code が各ブロックに差し込む style / script を除いた本体の markup */
const render = async (markdown: string): Promise<string> =>
  toHtml(await mdToHast(markdown))
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "");

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

describe("手動注入する資産", () => {
  test("CSS に styleOverrides が反映されている", async () => {
    const css = await codeStyles();

    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain("var(--border)");
    expect(css).toContain("--ec-frm-frameBoxShdCssVal:none");
  });

  test("クライアント側のスクリプトを取り出せる", async () => {
    expect((await codeScripts()).length).toBeGreaterThan(0);
  });

  test("レンダラは 1 度しか構築されない", async () => {
    // Shiki の初期化は重いため、記事ごとに作り直してはいけない
    expect(getRenderer()).toBe(getRenderer());
  });
});
