import type { Root } from "hast";
import { type Components, toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ReactElement } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

/**
 * hast を React 要素へ変換する。
 */
export function toReact(tree: Root, components?: Partial<Components>): ReactElement {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    ...(components ? { components } : {}),
  });
}
