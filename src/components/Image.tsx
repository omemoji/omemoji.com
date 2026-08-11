import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"img">, "src" | "alt"> & {
  src: string;
  alt: string;
  /** 本文中の画像は alt をキャプションとして出す。作品画像は出さない */
  caption?: boolean;
};

/**
 * 画像の描画。
 *
 * ここが最適化との境界になる。現時点では原寸をそのまま出すだけだが、
 * AVIF 変換と寸法の付与は**このコンポーネントの内側**で行う想定で、
 * 呼び出し側（ページ・Markdown の差し替え表）は変更しない。
 */
export default function Image({ src, alt, caption = false, ...rest }: Props) {
  // width / height は寸法マニフェストと同時に入れる（画像最適化のフェーズ）
  const image = (
    <img className="content-image" src={src} alt={alt} loading="lazy" decoding="async" {...rest} />
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
