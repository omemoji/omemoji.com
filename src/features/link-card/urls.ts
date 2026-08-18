import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { linkCardParagraphs } from "@/features/markdown/plugins/remark-link-card";

/**
 * カードにする URL を集めるためだけのパーサ。
 *
 * 描画のパイプラインと同じ前半（parse → frontmatter → gfm）を並べる。
 * 裸の URL がリンクになるのは gfm の autolink literal によるため、これが要る。
 * ハイライトや数式は URL の判定に関係しないので通さない（取得の前段を軽く保つ）
 */
const parser = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm).freeze();

/**
 * Markdown 本文からリンクカードにする URL を集める。
 *
 * 取得はビルドの前段（ステージ）で一括して行うため、描画より先に URL の一覧が要る。
 * 判定は remark-link-card の linkCardParagraphs をそのまま呼ぶので、
 * 集めた URL と描画される URL は一致する（脚注の中を除くのも同じ関数の中）。
 */
export function collectLinkCardUrls(markdown: string): string[] {
  const tree = parser.parse(markdown) satisfies Root;

  return [...linkCardParagraphs(tree)].map((paragraph) => paragraph.children[0].url);
}

/** 複数の本文から重複を除いて集める */
export function collectAllLinkCardUrls(bodies: string[]): string[] {
  return [...new Set(bodies.flatMap(collectLinkCardUrls))];
}
