import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import ArticleToc from "@/components/ArticleToc";

const headings = [
  { depth: 2, slug: "intro", text: "はじめに" },
  { depth: 3, slug: "detail", text: "詳細" },
];

test("見出しをアンカーとして並べ、深さを属性で持つ", () => {
  const html = renderToStaticMarkup(<ArticleToc headings={headings} />);

  expect(html).toContain('<a href="#intro">はじめに</a>');
  expect(html).toContain('data-depth="3"');
  expect(html).toContain("<summary>");
});

test("見出しが無い記事では何も描かない", () => {
  // 空の details だけが残ると、開いても中身の無い「目次」が出てしまう
  expect(renderToStaticMarkup(<ArticleToc headings={[]} />)).toBe("");
});
