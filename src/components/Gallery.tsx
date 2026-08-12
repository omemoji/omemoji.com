import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";
import { resolveImage } from "@/features/image/manifest";

/**
 * 作品一覧。正方形に切り抜いた 3 列のグリッド。
 *
 * 寸法は CSS（`aspect-ratio: 1` + `object-fit: cover`）が決めるため、
 * ここでは最適化された URL へ差し替えるだけにする。
 */
export default function Gallery({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="gallery">
      {artworks.map((artwork) => {
        const src = imageUrl("artworks", artwork.id, artwork.src);

        return (
          <a key={artwork.id} href={`/artworks/${artwork.id}`}>
            <img
              src={resolveImage(src)?.src ?? src}
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
