import type { ComponentProps } from "react";

import { resolveImage } from "@/features/image/manifest";

type ImgProps = Omit<ComponentProps<"img">, "src" | "alt" | "width" | "height"> & {
  src: string;
  alt: string;
  /**
   * 表示サイズ（CSS ピクセル）。**渡した値がそのまま最適化の指示になる。**
   * 両方渡すとその箱に切り抜き、幅だけなら幅に収める。省くと本文用（幅 700px）
   */
  width?: number;
  height?: number;
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
 *
 * 実ブラウザでも、両方の属性が揃っていれば UA スタイルシートが
 * `aspect-ratio: auto <width> / <height>` を導くため、読み込み前に場所が確保される
 * （レイアウトのずれ = CLS が起きない）。**縦横比を別途宣言する必要はない。**
 * 効かせる条件は高さを `auto` に保つことだけで、リセットと `.content-image` が満たしている
 */
export function Picture({ src, alt, width, height, ...rest }: ImgProps) {
  const optimized = resolveImage(src, { ...(width && { width }), ...(height && { height }) });
  // 属性は求めた表示サイズを優先する。切り抜きは実体を 2 倍で作るため、
  // 出力された寸法をそのまま出すと倍の大きさで表示されてしまう
  const size = { width: width ?? optimized?.width, height: height ?? optimized?.height };

  // フォールバック先が原寸であるため、img は最適化前の URL を指す
  const image = <img src={src} alt={alt} {...size} {...rest} />;

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
 *
 * `width` / `height` の扱いは `Picture` と同じ（渡さなければ本文用の既定）。
 * ここで別に引き当てると、切り抜きを求めても既定の縦横比が出てしまう
 */
export default function Image({ src, alt, caption = false, ...rest }: Props) {
  const image = (
    <Picture
      className="content-image"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
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
