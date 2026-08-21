import { beforeEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { CODE_ASSETS, KATEX_CSS, STYLESHEET } from "@/config";
import { assetUrl, clearAssetManifest, setAssetManifest } from "@/features/asset/manifest";
import { clearOgManifest, setOgManifest } from "@/features/og/manifest";
import Layout from "@/layouts/Layout";

const render = (props: Partial<Parameters<typeof Layout>[0]> = {}): string =>
  renderToStaticMarkup(
    <Layout title="題" description="説明" path="/" {...props}>
      <p>本文</p>
    </Layout>
  );

// ビルドを走らせるテストと同じプロセスに載るため、毎回落とす
beforeEach(() => {
  clearAssetManifest();
  clearOgManifest();
});

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

/**
 * URL は assetUrl 越しに引く。ビルドは指紋付き、dev はマニフェストを差し込まないため素の名前。
 * ここを直書きに戻すと、指紋を付けてもページが古い URL を指したままになる
 */
describe("指紋付きの URL", () => {
  test("マニフェストが無ければ論理名をそのまま指す", () => {
    expect(render()).toContain(`href="/${STYLESHEET}"`);
  });

  test("マニフェストがあれば指紋付きの URL を指す", () => {
    setAssetManifest({
      [STYLESHEET]: "/globals.0123456789abcdef.css",
      [KATEX_CSS]: "/katex/katex.min.0123456789abcdef.css",
      [CODE_ASSETS.css]: "/code.0123456789abcdef.css",
      [CODE_ASSETS.js]: "/code.0123456789abcdef.js",
    });
    const html = render({ math: true, code: true });

    expect(html).toContain('href="/globals.0123456789abcdef.css"');
    expect(html).toContain('href="/katex/katex.min.0123456789abcdef.css"');
    expect(html).toContain('href="/code.0123456789abcdef.css"');
    expect(html).toContain('src="/code.0123456789abcdef.js"');
    // 指紋の無い URL は 1 つも残らない
    expect(html).not.toContain(`"/${STYLESHEET}"`);
    expect(assetUrl(STYLESHEET)).toBe("/globals.0123456789abcdef.css");
  });
});

describe("共通の <head>", () => {
  test("globals.css は常に読む", () => {
    expect(render()).toContain(`href="/${STYLESHEET}"`);
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

/**
 * 個別の OGP 画像の出し先は種類で違う。**記事の画像は Twitter Card 専用**で、
 * og:image を読む通常のリンクカードには共通の画像を出す
 */
describe("OGP 画像", () => {
  test("個別の画像が無ければ共通の画像と通常のカード", () => {
    const html = render({ path: "/articles" });

    expect(html).toContain('property="og:image" content="https://omemoji.com/omemoji.png"');
    expect(html).toContain('name="twitter:image" content="https://omemoji.com/omemoji.png"');
    expect(html).toContain('name="twitter:card" content="summary"');
    expect(html).toContain('property="og:type" content="website"');
  });

  test("記事は Twitter だけが個別の画像を使う", () => {
    setOgManifest({
      "/articles/foo": {
        src: "/images/og/articles/foo.png",
        width: 1200,
        height: 630,
        kind: "article",
      },
    });
    const html = render({ path: "/articles/foo" });

    // リンクカードはサイトの顔（720x720）のまま
    expect(html).toContain('property="og:image" content="https://omemoji.com/omemoji.png"');
    expect(html).toContain('property="og:image:width" content="720"');
    expect(html).toContain(
      'name="twitter:image" content="https://omemoji.com/images/og/articles/foo.png"'
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  test("作品は og:image も個別の画像を使う", () => {
    setOgManifest({
      "/artworks/x": {
        src: "/images/og/artworks/x.png",
        width: 1200,
        height: 630,
        kind: "artwork",
      },
    });
    const html = render({ path: "/artworks/x" });

    expect(html).toContain(
      'property="og:image" content="https://omemoji.com/images/og/artworks/x.png"'
    );
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain(
      'name="twitter:image" content="https://omemoji.com/images/og/artworks/x.png"'
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });
});
