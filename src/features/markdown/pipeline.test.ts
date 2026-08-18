import { describe, expect, test } from "bun:test";
import { toHtml } from "hast-util-to-html";

import { mdToHast } from "@/features/markdown/pipeline";

const render = async (markdown: string): Promise<string> => toHtml(await mdToHast(markdown));

describe("プラグインの配線", () => {
  // プラグイン自体の動作はライブラリの責務なので、出力全体は固定しない
  test("意図したプラグインが意図した設定で接続されている", async () => {
    const wiring = [
      ["remark-gemoji", "やった :tada:", "🎉"],
      ["remark-denden-ruby", "{電子書籍|でんししょせき}", "<ruby>"],
      ["remark-math / rehype-katex", "$E = mc^2$", 'class="katex"'],
      ["remark-gfm（脚注）+ footnoteLabel", "本文[^1]\n\n[^1]: 注釈", ">脚注</a>"],
      ["remark-gfm（表）", "| a |\n| - |\n| b |", "<table>"],
      ["remark-gfm（打ち消し線）", "~~取り消し~~", "<del>"],
      ["rehype-raw", "<details>\n<summary>詳細</summary>\n</details>", "<details>"],
      ["rehype-slug + autolink-headings", "## はじめに", '<h2 id="はじめに"><a href="#はじめに">'],
      ["remark-frontmatter", '---\ntitle: "タイトル"\n---\n\n本文', "<p>本文</p>"],
    ] as const;

    const disconnected: string[] = [];
    for (const [plugin, source, marker] of wiring) {
      if (!(await render(source)).includes(marker)) disconnected.push(plugin);
    }

    expect(disconnected).toEqual([]);
  });

  test("rehype-unwrap-images が画像を段落から取り出す", async () => {
    // 「含まれない」ことの検査なので上の表には乗らない
    expect(await render("![説明](./sample.png)")).not.toContain("<p>");
  });

  test("数式が元の TeX を保ったまま組版される", async () => {
    // KaTeX の出力は数 KB になるためスナップショットにせず、入出力の対応だけを見る
    const block = await render("$$\n\\int_0^1 x^2 dx\n$$");

    expect(block).toStartWith(`<span class="katex-display">`);
    expect(block).toContain(
      `<annotation encoding="application/x-tex">\\int_0^1 x^2 dx</annotation>`
    );
  });
});

describe("プラグインの順序", () => {
  // .use() の並びには互いに依存する制約があり、破ると症状がばらばらに現れる。
  // 機能別のテストに散らすと順序の問題として結びつかないため、ここに集める
  test("順序に依存する変換がすべて成立している", async () => {
    const constraints = [
      [
        "slug / autolink は rehype-katex より前（後だと MathML の読みを slug が拾う）",
        "## $E = mc^2$ の話",
        'id="e--mc2-の話"',
      ],
      [
        "rehype-katex は expressive-code より前（後だと language-math として食われる）",
        "$$\nE = mc^2\n$$",
        `<span class="katex-display">`,
      ],
      [
        "expressive-code は rehype-raw より前（後だと直列化で data.meta が消える）",
        '```ts title="lib/data.ts"\nconst a = 1;\n```',
        "lib/data.ts",
      ],
    ] as const;

    const violated: string[] = [];
    for (const [constraint, source, marker] of constraints) {
      if (!(await render(source)).includes(marker)) violated.push(constraint);
    }

    expect(violated).toEqual([]);
  });
});

// 自作プラグインの分岐そのものなので、境界を 1 件ずつ主張する
describe("リンクカードの判定", () => {
  test("単独の段落に置かれた裸の外部リンクは linkcard になる", async () => {
    expect(await render("https://example.com")).toMatchInlineSnapshot(
      `"<a href="https://example.com" linkcard="">https://example.com</a>"`
    );
  });

  test("文中のリンクは linkcard にならない", async () => {
    expect(await render("詳しくは https://example.com を参照")).toMatchInlineSnapshot(
      `"<p>詳しくは <a href="https://example.com">https://example.com</a> を参照</p>"`
    );
  });

  test("表題の付いたリンクは linkcard にならない", async () => {
    expect(await render("[例](https://example.com)")).toMatchInlineSnapshot(
      `"<p><a href="https://example.com">例</a></p>"`
    );
  });

  test("相対リンクは linkcard にならない", async () => {
    expect(await render("[/artworks](/artworks)")).toMatchInlineSnapshot(
      `"<p><a href="/artworks">/artworks</a></p>"`
    );
  });

  // 脚注は本文の傍らの小さな注記。出典として URL を 1 行置くのは普通の書き方だが、
  // そこがカードに開くと注記より大きくなる
  test("脚注に単独で置いた URL は linkcard にならない", async () => {
    const html = await render("本文[^a]\n\n[^a]: https://example.com");

    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
    expect(html).not.toContain("linkcard");
  });

  test("脚注の入れ子の中の URL も linkcard にならない", async () => {
    // 脚注が箇条書きなどを含むこともある。直下だけを見ていると漏れる
    const html = await render("本文[^a]\n\n[^a]: 説明\n\n    https://example.com");

    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
    expect(html).not.toContain("linkcard");
  });

  test("脚注があっても本文の URL は linkcard になる", async () => {
    const html = await render(
      "https://example.com/body\n\n本文[^a]\n\n[^a]: https://example.com/note"
    );

    expect(html).toContain('<a href="https://example.com/body" linkcard="">');
    expect(html).toContain('<a href="https://example.com/note">');
  });
});

// 実データ（content/articles）の検査は pipeline.integration.test.ts にある
