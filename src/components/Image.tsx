import type { ComponentProps } from "react";

import { resolveImage } from "@/features/image/manifest";

type Props = Omit<ComponentProps<"img">, "src" | "alt"> & {
  src: string;
  alt: string;
  /** 本文中の画像は alt をキャプションとして出す。作品画像は出さない */
  caption?: boolean;
};

/**
 * 画像の描画。
 *
 * 最適化との境界。呼び出し側（ページ・Markdown の差し替え表）は原寸の URL を渡し、
 * AVIF への差し替えと寸法の付与はここで行う。マニフェストに無い画像
 * （svg や、最適化を通していない dev の一部）は原寸のまま出る。
 */
export default function Image({ src, alt, caption = false, ...rest }: Props) {
  const optimized = resolveImage(src);

  const image = (
    <img
      className="content-image"
      src={optimized?.src ?? src}
      alt={alt}
      loading="lazy"
      decoding="async"
      // 寸法を出すと読み込み前から場所が確保され、レイアウトのずれ（CLS）が起きない。
      // width / height だけでは CSS の inline-size: 100% に負けるため aspect-ratio も添える
      {...(optimized && {
        width: optimized.width,
        height: optimized.height,
        style: { aspectRatio: `${optimized.width} / ${optimized.height}` },
      })}
      {...rest}
    />
  );

  if (!caption || alt === "") {
    return image;
  }

  return (
    <figure>
      {image}
      <figcaption className="caption">{alt}</figcaption>
    </figure>
  );
}
