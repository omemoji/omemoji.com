import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExpressiveCode from "rehype-expressive-code";
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

import { rewriteImageUrls } from "@/features/image/assets";
import { expressiveCodeOptions, getRendererWithoutAssets } from "@/features/markdown/highlight";
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
  // 以降の並びは相互に依存しているため、動かす際は下記の理由を確認すること。
  //
  // slug / autolink は数式の展開より前。KaTeX 展開後に id を振ると、
  // MathML の読みまで拾って slug が壊れる（例: emc2e--mc2emc2-の話）。
  // 生 HTML で書かれた見出しには id が付かなくなるが、そのような記事は無い
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: "wrap" })
  // 数式は expressive-code より前。$$...$$ は language-math のコードブロックとして
  // 出力されるため、先に変換しないとハイライト対象として食われる
  .use(rehypeKatex)
  // expressive-code は rehype-raw より前。rehype-raw は木を HTML へ直列化して読み直すため、
  // コードフェンスの meta（title= など）を保持している data が失われる。
  //
  // レンダラは getRenderer が 1 度だけ構築したものを共有する。渡すのは CSS と JS を
  // 抜いた版で、ページごとの複製を止めている（highlight.ts の注記を参照）
  .use(rehypeExpressiveCode, {
    ...expressiveCodeOptions,
    customCreateRenderer: getRendererWithoutAssets,
  })
  // allowDangerousHtml で残した生 HTML を実際の要素へ組み立てる
  .use(rehypeRaw)
  .use(rehypeUnwrapImages)
  .freeze();

type Options = {
  /** 本文中の相対的な画像参照を解決する基点。features/image の imageBase が供給する */
  imageBase?: string;
};

/** Markdown 本文を hast へ変換する */
export async function mdToHast(markdown: string, options: Options = {}): Promise<HastRoot> {
  const mdast = processor.parse(markdown) satisfies MdastRoot;
  // expressive-code の変換が非同期のため、同期版は使わない
  const tree = (await processor.run(mdast)) satisfies HastRoot;

  // プロセッサは freeze して使い回すため、記事ごとに変わる値はここで適用する
  return options.imageBase ? rewriteImageUrls(tree, options.imageBase) : tree;
}
