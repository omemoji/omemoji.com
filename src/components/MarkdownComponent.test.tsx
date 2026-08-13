import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { markdownComponents } from "@/components/MarkdownComponent";
import { clearLinkCardManifest, setLinkCardManifest } from "@/features/link-card/manifest";
import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";

const render = async (markdown: string) =>
  renderToStaticMarkup(toReact(await mdToHast(markdown), markdownComponents));

afterEach(() => {
  clearLinkCardManifest();
});

describe("markdownComponents", () => {
  test("linkcard の印が DOM に漏れない", async () => {
    // remark-link-card が付ける印は描画のためのもので、HTML の属性ではない
    const html = await render("https://example.com");

    expect(html).not.toContain("linkcard=");
  });

  test("取得できていない URL は素のリンクになる", async () => {
    // dev でキャッシュに無い場合と、取得に失敗した場合がここに来る
    expect(await render("https://example.com")).toBe(
      '<a href="https://example.com">https://example.com</a>'
    );
  });

  test("取得済みの URL はカードになる", async () => {
    setLinkCardManifest({
      "https://example.com": {
        url: "https://example.com",
        title: "題",
        description: "説明",
        image: { src: "/images/ogp_link/abc.webp", width: 228, height: 120 },
      },
    });

    const html = await render("https://example.com");

    expect(html).toContain('class="link-card"');
    expect(html).toContain("題");
    expect(html).toContain("説明");
    // 表示する URL はホスト名だけ
    expect(html).toContain(">example.com<");
    expect(html).toContain('src="/images/ogp_link/abc.webp"');
  });

  test("画像が無ければ文字だけのカードになる", async () => {
    setLinkCardManifest({
      "https://example.com": { url: "https://example.com", title: "題", description: "" },
    });

    const html = await render("https://example.com");

    expect(html).toContain('class="link-card"');
    expect(html).not.toContain("<img");
  });

  test("文中のリンクはカードにしない", async () => {
    expect(await render("[例](https://example.com)")).toBe(
      '<p><a href="https://example.com">例</a></p>'
    );
  });
});
