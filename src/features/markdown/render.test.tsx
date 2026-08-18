import { describe, expect, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";

const render = async (markdown: string, components?: Parameters<typeof toReact>[1]) =>
  renderToStaticMarkup(toReact(await mdToHast(markdown), components));

describe("toReact", () => {
  test("hast を React 要素へ変換する", async () => {
    expect(await render("**強調**と`コード`")).toBe(
      "<p><strong>強調</strong>と<code>コード</code></p>"
    );
  });

  test("差し替え表を渡さなくても変換できる", async () => {
    // 汎用に保つため、components は省略可能でなければならない
    expect(await render("## 見出し")).toContain("<h2");
  });

  test("要素をコンポーネントへ差し替えられる", async () => {
    const components = { p: ({ children }: { children?: ReactNode }) => <div>{children}</div> };

    expect(await render("段落", components)).toBe("<div>段落</div>");
  });

  test("KaTeX が出力する MathML を描画できる", async () => {
    // 名前空間付き属性を含むため、素朴な変換だと落ちやすい
    expect(await render("$E = mc^2$")).toContain(
      '<math xmlns="http://www.w3.org/1998/Math/MathML">'
    );
  });

  test("expressive-code の出力を描画できる", async () => {
    // CSS と JS は共通ファイルへ追い出してあるので、本文には markup だけが来る
    const html = await render("```sh\necho 1\n```");

    expect(html).toContain("expressive-code");
    expect(html).not.toContain("<style>");
    expect(html).not.toContain("<script");
  });

  test("生 HTML から組み立てた要素を描画できる", async () => {
    expect(await render("<details>\n<summary>詳細</summary>\n\n中身\n\n</details>")).toContain(
      "<details>"
    );
  });
});

// 実データ（content/articles）の検査は render.integration.test.tsx にある
