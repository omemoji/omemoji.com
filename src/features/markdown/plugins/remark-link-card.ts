import type { Link, Paragraph, Root } from "mdast";
import type {} from "mdast-util-to-hast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { isBareExternalLink } from "./mdast-util-node-is";

/** 裸の外部リンク 1 つだけからなる段落 */
export type LinkCardParagraph = Paragraph & { children: [Link] };

/** カードにする形をしているか。段落に裸の外部リンクが 1 つだけある場合 */
export function isLinkCardParagraph(node: Paragraph): node is LinkCardParagraph {
  return node.children.length === 1 && isBareExternalLink(node.children[0]);
}

/**
 * 木の中でカードにする段落を全て集める。
 *
 * **描画（このプラグイン）も URL の事前収集（features/link-card/urls.ts）も
 * ここだけを見る。** 判定が割れると、取得した URL と描画される URL が食い違い、
 * カードにならない素のリンクや、誰も参照しないサムネイルが出る。
 *
 * 脚注の中は除く。脚注は本文の傍らに置く小さな注記であり、出典として URL を
 * 1 行だけ置くのはごく普通の書き方だが、そこがカードに開くと注記より大きくなる
 */
export function linkCardParagraphs(tree: Root): Set<LinkCardParagraph> {
  const inFootnote = new Set<Paragraph>();
  visit(tree, "footnoteDefinition", (definition) => {
    // 脚注が箇条書きなどを含むこともあるため、直下だけでなく中を全て見る
    visit(definition, "paragraph", (paragraph) => {
      inFootnote.add(paragraph);
    });
  });

  const cards = new Set<LinkCardParagraph>();
  visit(tree, "paragraph", (node) => {
    if (!inFootnote.has(node) && isLinkCardParagraph(node)) {
      cards.add(node);
    }
  });

  return cards;
}

const remarkLinkcard: Plugin<[], Root> = () => {
  return (tree) => {
    const cards = linkCardParagraphs(tree);

    visit(tree, "paragraph", (node, index, parent) => {
      // 形の判定は型を絞るため、カードにするかどうかは cards が決める（脚注はここで落ちる）
      if (!parent || typeof index !== "number" || !isLinkCardParagraph(node) || !cards.has(node)) {
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
