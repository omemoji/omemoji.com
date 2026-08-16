import type { Artwork } from "@/collections/artworks";
import { Picture } from "@/components/Image";
import { imageUrl } from "@/features/image/assets";

/**
 * ギャラリー（一覧・帯）での表示サイズ。実際の表示幅は本文幅の 1/3（約 233px）で
 * 可変だが、`width` / `height` 属性は 1 つの値しか持てない。
 * **CSS を解釈しない UA（端末ブラウザ）ではこの値がそのまま表示サイズになる。**
 * 最適化もこの値を見て、切り抜いた画像を作る
 */
export const GALLERY_SIZE = 240;

/**
 * 作品一覧。正方形に切り抜いた 3 列のグリッド。
 *
 * 画像は**切り抜き済みの小さいバリアント**を指す。CSS で切り抜くだけでは
 * 本文用の大きさをそのまま転送して捨てることになる。
 *
 * 属性の寸法は実体（480px）ではなく**表示サイズ（240px）**を渡して上書きする。
 * 高密度画面向けに 2 倍の実体を等倍で見せるため、属性が実体と一致しない。
 */
export default function Gallery({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="gallery">
      {artworks.map((artwork) => {
        const src = imageUrl("artworks", artwork.id, artwork.src);

        return (
          <a key={artwork.id} href={`/artworks/${artwork.id}`}>
            <Picture
              src={src}
              alt={artwork.title}
              width={GALLERY_SIZE}
              height={GALLERY_SIZE}
              loading="lazy"
              decoding="async"
            />
          </a>
        );
      })}
    </div>
  );
}
