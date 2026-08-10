import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkRuby from "remark-denden-ruby";
import remarkFrontmatter from "remark-frontmatter";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import remarkLinkcard from "@/features/markdown/plugins/remark-link-card";

/**
 * Markdown を hast へ変換するプロセッサ。
 *
 * freeze することで使い回せる状態にし、記事ごとの再構築を避ける。
 * 構文ハイライト（expressive-code）はこの後段に差し込む。
 */
const processor = unified()
  .use(remarkParse)
  // 本文は loadArticles が frontmatter を除いた状態で渡すが、
  // 生の Markdown を直接流しても本文として描画されないようにしておく
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkGemoji)
  .use(remarkRuby)
  .use(remarkMath)
  .use(remarkLinkcard)
  .use(remarkRehype, { allowDangerousHtml: true, footnoteLabel: "脚注" })
  // allowDangerousHtml で残した生 HTML を実際の要素へ組み立てる。
  // 見出しに id を振る前に置く必要がある（生 HTML 内の見出しも対象にするため）
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: "wrap" })
  .use(rehypeKatex)
  .use(rehypeUnwrapImages)
  .freeze();

/** Markdown 本文を hast へ変換する */
export async function mdToHast(markdown: string): Promise<HastRoot> {
  const mdast = processor.parse(markdown) satisfies MdastRoot;
  // expressive-code の変換が非同期のため、同期版は使わない
  return (await processor.run(mdast)) satisfies HastRoot;
}
