import type { ComponentProps } from "react";

import { resolveImage } from "@/features/image/manifest";

type ImgProps = Omit<ComponentProps<"img">, "src" | "alt"> & { src: string; alt: string };

/**
 * 最適化された画像を出し、AVIF を解釈できない環境では原寸へ倒す。
 *
 * `<img src="....avif">` 単体だと、非対応の環境では代替が無く空白になる。
 * 原寸は作品ページの原寸リンクのために `out/` へ出しているので、
 * フォールバック先を増やしても変換もファイルも増えない。
 *
 * マニフェストに無い画像（svg・最適化を通していないもの）は `<picture>` にせず素の `<img>` を出す。
 */
export function Picture({ src, alt, ...rest }: ImgProps) {
  const optimized = resolveImage(src);
  // フォールバック先が原寸であるため、img は最適化前の URL を指す
  const image = <img src={src} alt={alt} {...rest} />;

  // 変換していなければ包まない。dev のマニフェストは原寸を指すため、
  // ここを見ないと PNG を image/avif だと名乗る source が出る
  if (!optimized || optimized.src === src) {
    return image;
  }

  return (
    <picture>
      <source srcSet={optimized.src} type="image/avif" />
      {image}
    </picture>
  );
}

type Props = ImgProps & {
  /** 本文中の画像は alt をキャプションとして出す。作品画像は出さない */
  caption?: boolean;
};

/**
 * 本文・作品の画像。
 *
 * 最適化との境界。呼び出し側（ページ・Markdown の差し替え表）は原寸の URL を渡し、
 * AVIF への差し替えと寸法の付与はここで行う。
 */
export default function Image({ src, alt, caption = false, ...rest }: Props) {
  const optimized = resolveImage(src);

  const image = (
    <Picture
      className="content-image"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      // 寸法を出すと読み込み前から場所が確保され、レイアウトのずれ（CLS）が起きない。
      // 縦横比は原寸と変わらないので、フォールバックした場合もこの値でよい。
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
