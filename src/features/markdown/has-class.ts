import type { Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * 指定したクラスを持つ要素が木に含まれるか。
 *
 * KaTeX と expressive-code の CSS はどちらも「使うページだけが読む」形にしてあり、
 * その判定がこの形に揃うため共通化している（hasMath / hasCode）。
 */
export function hasClass(tree: Root, className: string): boolean {
  let found = false;

  visit(tree, "element", (node) => {
    const classes = node.properties?.className;
    if (Array.isArray(classes) && classes.includes(className)) {
      found = true;
    }
  });

  return found;
}
