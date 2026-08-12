import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";
import { resolveImage } from "@/features/image/manifest";

type Props = {
  artworks: Artwork[];
  /** 現在表示している作品。強調し、初期スクロール位置の基準にする */
  current: string;
};

/**
 * 作品詳細の下に置く横スクロールの帯。
 *
 * 表示中の作品を中央へ寄せる処理だけはスクロール位置の操作が要るため、
 * 最小限のスクリプトを添える（CSS だけでは初期位置を決められない）。
 */
export default function GalleryRow({ artworks, current }: Props) {
  const index = artworks.findIndex((artwork) => artwork.id === current);

  return (
    <div className="gallery-row" data-current={index}>
      <div className="gallery-row-track">
        {artworks.map((artwork) => {
          // 帯も正方形に切り抜くため、寸法は付けず URL の差し替えだけを行う
          const src = imageUrl("artworks", artwork.id, artwork.src);

          return (
            <a
              key={artwork.id}
              href={`/artworks/${artwork.id}`}
              aria-current={artwork.id === current ? "page" : undefined}
            >
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
    </div>
  );
}

/** 表示中の作品が画面中央に来るようスクロールさせる */
export const galleryRowScript = `
const row = document.querySelector(".gallery-row");
const target = row?.children[0]?.children[Number(row.dataset.current)];
if (row && target) {
  row.scrollLeft = target.offsetLeft - (row.clientWidth - target.clientWidth) / 2;
}
`;
