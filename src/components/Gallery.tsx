import { Picture } from "@/components/Image";
import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";
import { THUMB_DISPLAY_SIZE, THUMB_VARIANT } from "@/features/image/optimize";

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
              variant={THUMB_VARIANT}
              alt={artwork.title}
              width={THUMB_DISPLAY_SIZE}
              height={THUMB_DISPLAY_SIZE}
              loading="lazy"
              decoding="async"
            />
          </a>
        );
      })}
    </div>
  );
}
