import { describe, expect, test } from "bun:test";

import { collectHeadings } from "@/features/markdown/headings";
import { mdToHast } from "@/features/markdown/pipeline";

const toc = async (markdown: string) => collectHeadings(await mdToHast(markdown));

describe("collectHeadings", () => {
  test("見出しが無ければ空になる", async () => {
    expect(await toc("本文だけの記事\n\n段落が続く")).toEqual([]);
  });

  test("h1 から h3 までを出現順に集める", async () => {
    expect(await toc("# 一\n\n## 二\n\n### 三")).toEqual([
      { depth: 1, slug: "一", text: "一" },
      { depth: 2, slug: "二", text: "二" },
      { depth: 3, slug: "三", text: "三" },
    ]);
  });

  test("h4 以降は目次に載せない", async () => {
    expect(await toc("#### 四\n\n##### 五\n\n###### 六")).toEqual([]);
  });

  test("autolink-headings が挟む <a> を透過して文字列を取る", async () => {
    // behavior: "wrap" により見出しの中身は <a> に包まれている
    expect(await toc("## はじめに")).toEqual([{ depth: 2, slug: "はじめに", text: "はじめに" }]);
  });

  test("装飾を含む見出しは文字列だけを取る", async () => {
    expect(await toc("## **強調**と`コード`")).toEqual([
      { depth: 2, slug: "強調とコード", text: "強調とコード" },
    ]);
  });

  test("同名の見出しでも slug は重複しない", async () => {
    const headings = await toc("## 同じ\n\n## 同じ");
    expect(headings.map((heading) => heading.slug)).toEqual(["同じ", "同じ-1"]);
  });

  test("数式を含む見出しは組版結果ではなく元の TeX を載せる", async () => {
    // KaTeX は MathML と視覚表示用の 2 通りを出力するため、素朴に辿ると読みが二重になる
    expect(await toc("## $E = mc^2$ の話")).toEqual([
      { depth: 2, slug: "e--mc2-の話", text: "E = mc^2 の話" },
    ]);
  });
});

// 実データ（content/articles）の検査は headings.integration.test.ts にある
