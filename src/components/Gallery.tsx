import { Picture } from "@/components/Image";
import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";

/**
 * 作品一覧。正方形に切り抜いた 3 列のグリッド。
 *
 * 寸法は CSS（`aspect-ratio: 1` + `object-fit: cover`）が決めるため、
 * 本文の画像と違い width / height は出さない。AVIF のフォールバックは同じ経路を通す。
 */
export default function Gallery({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="gallery">
      {artworks.map((artwork) => {
        const src = imageUrl("artworks", artwork.id, artwork.src);

        return (
          <a key={artwork.id} href={`/artworks/${artwork.id}`}>
            <Picture src={src} alt={artwork.title} loading="lazy" decoding="async" />
          </a>
        );
      })}
    </div>
  );
}
