import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CODE_ASSETS } from "@/config";
import Layout from "@/layouts/Layout";

const render = (props: Partial<Parameters<typeof Layout>[0]> = {}): string =>
  renderToStaticMarkup(
    <Layout title="題" description="説明" path="/" {...props}>
      <p>本文</p>
    </Layout>
  );

/**
 * KaTeX と expressive-code の CSS は、どちらも「使うページだけが読む」。
 * 全ページに配ると重く、必要なページで抜けると表示が壊れる
 */
describe("ページごとに読み分ける資産", () => {
  test("既定ではどちらも読まない", () => {
    const html = render();

    expect(html).not.toContain("katex.min.css");
    expect(html).not.toContain(CODE_ASSETS.css);
    expect(html).not.toContain(CODE_ASSETS.js);
  });

  test("math を渡すと KaTeX の CSS を読む", () => {
    expect(render({ math: true })).toContain('href="/katex/katex.min.css"');
  });

  test("code を渡すとコードブロックの CSS と JS を読む", () => {
    const html = render({ code: true });

    expect(html).toContain(`href="/${CODE_ASSETS.css}"`);
    expect(html).toContain(`<script type="module" src="/${CODE_ASSETS.js}"`);
  });

  test("code を渡してもページ本体に資産を埋め込まない", () => {
    // 差し込みを止めた意味が無くなるため、インラインへ戻っていないことを見る
    expect(render({ code: true })).not.toContain("<style>");
  });
});

describe("共通の <head>", () => {
  test("globals.css は常に読む", () => {
    expect(render()).toContain('href="/globals.css"');
  });

  test("og:image は絶対 URL になる", () => {
    // クローラは相対パスを解決できない
    expect(render()).toContain('property="og:image" content="https://omemoji.com/omemoji.png"');
  });

  test("path から canonical と og:url を組み立てる", () => {
    const html = render({ path: "/articles/foo" });

    expect(html).toContain('rel="canonical" href="https://omemoji.com/articles/foo"');
    expect(html).toContain('property="og:url" content="https://omemoji.com/articles/foo"');
  });
});
