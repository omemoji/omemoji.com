import { Picture } from "@/components/Image";
import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";
import { THUMB_VARIANT } from "@/features/image/optimize";

/**
 * 作品一覧。正方形に切り抜いた 3 列のグリッド。
 *
 * 寸法は CSS（`aspect-ratio: 1` + `object-fit: cover`）が決めるため、
 * 本文の画像と違い width / height は出さない。AVIF のフォールバックは同じ経路を通す。
 *
 * 画像は**切り抜き済みの小さいバリアント**を指す。CSS で切り抜くだけでは
 * 本文用の大きさをそのまま転送して捨てることになる。
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
              loading="lazy"
              decoding="async"
            />
          </a>
        );
      })}
    </div>
  );
}
