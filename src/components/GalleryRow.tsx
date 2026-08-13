import { Picture } from "@/components/Image";
import type { Artwork } from "@/content/artworks";
import { imageUrl } from "@/features/image/assets";
import { THUMB_DISPLAY_SIZE, THUMB_VARIANT } from "@/features/image/optimize";

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
          // 帯も小さいバリアントを指し、属性でも寸法を出す（Gallery と同じ理由）
          const src = imageUrl("artworks", artwork.id, artwork.src);

          return (
            <a
              key={artwork.id}
              href={`/artworks/${artwork.id}`}
              aria-current={artwork.id === current ? "page" : undefined}
            >
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
    </div>
  );
}

/**
 * 表示中の作品が帯の中央に来るようスクロールさせる。
 *
 * offsetLeft は使えない。帯に position が無いため offsetParent は帯ではなく body になり、
 * 帯自身の左オフセット（本文の margin など）が余分に乗った値が返る。
 * 矩形の差なら基準点に依らないので、帯へ position を足す前提も持たずに済む。
 */
export const galleryRowScript = `
const row = document.querySelector(".gallery-row");
const target = row?.children[0]?.children[Number(row.dataset.current)];
if (row && target) {
  const offset = target.getBoundingClientRect().left - row.getBoundingClientRect().left;
  row.scrollLeft += offset - (row.clientWidth - target.clientWidth) / 2;
}
`;
