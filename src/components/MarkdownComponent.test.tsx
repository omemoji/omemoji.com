import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { markdownComponents } from "@/components/MarkdownComponent";
import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";

const render = async (markdown: string) =>
  renderToStaticMarkup(toReact(await mdToHast(markdown), markdownComponents));

describe("markdownComponents", () => {
  test("linkcard の印が DOM に漏れない", async () => {
    // remark-link-card が付ける印は描画のためのもので、HTML の属性ではない
    const html = await render("https://example.com");

    expect(html).not.toContain("linkcard");
    expect(html).toBe('<a href="https://example.com">https://example.com</a>');
  });

  test("通常のリンクはそのまま描画される", async () => {
    expect(await render("[例](https://example.com)")).toBe(
      '<p><a href="https://example.com">例</a></p>'
    );
  });
});
