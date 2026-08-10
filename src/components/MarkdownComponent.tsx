import type { Components } from "hast-util-to-jsx-runtime";
import type { ComponentProps } from "react";

/** remark-link-card が裸の外部リンクに付ける印。HTML の属性ではない */
type AnchorProps = ComponentProps<"a"> & { linkcard?: boolean | string };

function Anchor({ linkcard, ...props }: AnchorProps) {
  // 印をそのまま渡すと linkcard="" として DOM に出てしまうため、ここで取り除く。
  // カードの描画自体はリンクカードの実装時に足す
  return <a {...props} />;
}

/**
 * Markdown 由来の要素をコンポーネントへ差し替える表。
 *
 * 変換そのものは `features/markdown/render.tsx` の責務で、
 * 描画の知識だけをこちら側から供給する。
 */
export const markdownComponents: Partial<Components> = {
  a: Anchor,
};
