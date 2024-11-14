"use client";
import { ArtworkData } from "lib/interface";
import Link from "next/link";
import Picture from "next-export-optimize-images/picture";
import { w_md } from "../../../tailwind.config";

type Props = {
  artworks: Array<ArtworkData>;
  artwork_number: number;
  artwork_id: string;
};

export default function GalleryRow({
  artworks,
  artwork_number,
  artwork_id,
}: Props) {
  const image_size = w_md * 0.27;

  return (
    <>
      <style>
        {`
  .artwork-image{
    max-width: ${image_size}px;
  }
  `}
      </style>
      <div
        id="artworks_id"
        className="overflow-x-scroll border-t border-t-[var(--border)] flex-nowrap"
      >
        <div className="flex">
          {artworks.map((artwork) => (
            <div
              className="flex-none aspect-square w-[27vw] artwork-image px-1 py-2 "
              key={artwork.id}
            >
              <Link href={"/artworks/" + artwork.id}>
                <Picture
                  className={
                    "m-0 aspect-square object-cover rounded-md bg-white hover:opacity-40 transition-opacity" +
                    (artwork_id === artwork.id
                      ? " border-b-[color:var(--link)] border-b-4"
                      : "")
                  }
                  src={artwork.src}
                  quality={20}
                  width={image_size}
                  height={image_size}
                  alt={artwork.title}
                  loading="lazy"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
      {process.env.NODE_ENV !== "development" && (
        <script className="myscript" id="myscript">
          {`
      const element = document.getElementById("artworks_id");
      const scrollLeft = ${image_size} * ${artwork_number} * Math.min(window.innerWidth, ${w_md}) / ${w_md};
      element.scrollLeft = scrollLeft;
      `}
        </script>
      )}
    </>
  );
}
