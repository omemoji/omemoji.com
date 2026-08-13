import type { Link, Paragraph, Root } from "mdast";
import type {} from "mdast-util-to-hast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { isBareExternalLink } from "./mdast-util-node-is";

/**
 * カードにする段落か。段落に裸の外部リンクが 1 つだけある場合。
 *
 * URL を先に集めるステージ（features/link-card/collect.ts）も同じ判定を使う。
 * ここがずれると、取得した URL と描画される URL が食い違う
 */
export function isLinkCardParagraph(node: Paragraph): node is Paragraph & { children: [Link] } {
  return node.children.length === 1 && isBareExternalLink(node.children[0]);
}

const remarkLinkcard: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || typeof index !== "number" || !isLinkCardParagraph(node)) {
        return;
      }

      node.children[0].data = {
        ...node.children[0].data,
        hProperties: {
          ...node.children[0].data?.hProperties,
          linkcard: true,
        },
      };

      parent.children.splice(index, 1, node.children[0]);
      return [SKIP, index];
    });
  };
};

export default remarkLinkcard;
