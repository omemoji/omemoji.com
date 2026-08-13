import type { ComponentProps } from "react";

import { resolveImage } from "@/features/image/manifest";

type ImgProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  src: string;
  alt: string;
  /** 作る大きさの種類。ギャラリーは小さい正方形（THUMB_VARIANT）を指す */
  variant?: string;
};

/**
 * 最適化された画像を出し、AVIF を解釈できない環境では原寸へ倒す。
 *
 * `<img src="....avif">` 単体だと、非対応の環境では代替が無く空白になる。
 * 原寸は作品ページの原寸リンクのために `out/` へ出しているので、
 * フォールバック先を増やしても変換もファイルも増えない。
 *
 * マニフェストに無い画像（svg・最適化を通していないもの）は `<picture>` にせず素の `<img>` を出す。
 *
 * **寸法は分かる限り必ず属性で出す。**CSS を解釈しない・論理プロパティを読まない UA
 * （chawan などの端末ブラウザ）では属性が唯一の寸法になり、無いと原寸で表示される。
 * 実ブラウザでも読み込み前に場所が確保され、レイアウトのずれ（CLS）が起きない。
 */
export function Picture({ src, alt, variant, ...rest }: ImgProps) {
  const optimized = resolveImage(src, variant);
  // フォールバック先が原寸であるため、img は最適化前の URL を指す。
  // 呼び出し側が渡した寸法は後から重ねて上書きする（実体の 2 倍を等倍で見せる場合など）
  const image = (
    <img
      src={src}
      alt={alt}
      {...(optimized && { width: optimized.width, height: optimized.height })}
      {...rest}
    />
  );

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
      // 寸法は Picture が付ける。ここで足すのは縦横比だけ。
      // width / height 属性は CSS の inline-size: 100% に負けるため、
      // 本文では aspect-ratio も宣言しないと読み込み中に高さが潰れる
      {...(optimized && {
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
