import type { Element, ElementContent, Root } from "hast";
import { CONTINUE, EXIT, visit } from "unist-util-visit";

export type Heading = {
  /** h1 なら 1、h2 なら 2 */
  depth: number;
  /** rehype-slug が振った id。アンカーのリンク先になる */
  slug: string;
  /** 見出しの表示文字列 */
  text: string;
};

/** 目次に載せる最も深い見出し（h3 まで） */
const MAX_DEPTH = 3;

const HEADING_TAG = /^h([1-6])$/;

/** MathML から元の TeX を取り出す。目次には組版結果ではなく原文を載せる */
const texOf = (node: Element): string => {
  let tex = "";
  visit(node, "element", (child) => {
    if (child.tagName !== "annotation") return CONTINUE;
    tex = textOf(child.children);
    return EXIT;
  });
  return tex;
};

/**
 * 見出しの表示文字列を組み立てる。
 * autolink-headings が挟む <a> を透過し、KaTeX が視覚表示用に複製する
 * aria-hidden の枝は読み飛ばす。
 */
const textOf = (nodes: ElementContent[]): string =>
  nodes
    .map((node) => {
      if (node.type === "text") return node.value;
      if (node.type !== "element") return "";
      // KaTeX は同じ数式を MathML と視覚表示用の 2 通りで出力する
      const { ariaHidden } = node.properties;
      if (ariaHidden === "true") return "";
      if (node.tagName === "math") return texOf(node);
      return textOf(node.children);
    })
    .join("");

/** hast から目次を集める。深い見出しは落とす */
export function collectHeadings(tree: Root): Heading[] {
  const headings: Heading[] = [];

  visit(tree, "element", (node) => {
    const depth = Number(HEADING_TAG.exec(node.tagName)?.[1]);
    if (!depth || depth > MAX_DEPTH) return;

    const { id } = node.properties;
    headings.push({
      depth,
      slug: typeof id === "string" ? id : "",
      text: textOf(node.children),
    });
  });

  return headings;
}
