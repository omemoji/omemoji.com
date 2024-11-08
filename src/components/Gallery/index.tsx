import { ArtworkData } from "lib/interface";
import Link from "next/link";
import Picture from "next-export-optimize-images/picture";
import { w_md } from "../../../tailwind.config";

type Props = {
  artworks: Array<ArtworkData>;
};

export default async function Gallery({ artworks }: Props) {
  return (
    <>
      <div className="grid grid-cols-3">
        {artworks.map((artwork) => (
          <div key={artwork.id}>
            <Link href={"/artworks/" + artwork.id}>
              <Picture
                className="m-0 aspect-square object-cover"
                src={artwork.src}
                quality={20}
                width={w_md / 3}
                height={w_md / 3}
                alt={artwork.title}
                loading="lazy"
              />
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
