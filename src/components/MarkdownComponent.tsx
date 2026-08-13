import type { Components } from "hast-util-to-jsx-runtime";
import type { ComponentProps } from "react";

import Image from "@/components/Image";
import LinkCard from "@/components/LinkCard";

/** remark-link-card が裸の外部リンクに付ける印。HTML の属性ではない */
type AnchorProps = ComponentProps<"a"> & { linkcard?: boolean | string };

function Anchor({ linkcard, ...props }: AnchorProps) {
  // 印は取り除く。そのまま渡すと linkcard="" として DOM に出る
  if (linkcard !== undefined && typeof props.href === "string") {
    return <LinkCard href={props.href} />;
  }
  return <a {...props} />;
}

/**
 * Markdown 由来の要素をコンポーネントへ差し替える表。
 *
 * 変換そのものは `features/markdown/render.tsx` の責務で、
 * 描画の知識だけをこちら側から供給する。
 */
/**
 * src は pipeline が配信 URL へ書き換え済み。ここでは描画だけを担う。
 *
 * Markdown が持つ width / height は文字列で来るため落とす。本文の画像は
 * 大きさを指定せず、既定（幅 700px に収める）で最適化する
 */
function ContentImage({ src, alt, width: _w, height: _h, ...props }: ComponentProps<"img">) {
  return <Image src={src ?? ""} alt={alt ?? ""} caption {...props} />;
}

export const markdownComponents: Partial<Components> = {
  a: Anchor,
  img: ContentImage,
};
