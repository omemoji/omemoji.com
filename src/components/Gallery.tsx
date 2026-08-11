import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";

/** 作品一覧。正方形に切り抜いた 3 列のグリッド */
export default function Gallery({ artworks }: { artworks: Artwork[] }) {
  return (
    <div className="gallery">
      {artworks.map((artwork) => (
        <a key={artwork.id} href={`/artworks/${artwork.id}`}>
          <img
            src={imageUrl("artworks", artwork.id, artwork.src)}
            alt={artwork.title}
            loading="lazy"
            decoding="async"
          />
        </a>
      ))}
    </div>
  );
}
