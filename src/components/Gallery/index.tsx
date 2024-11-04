import { artData } from "lib/data";
import Link from "next/link";
import Image from "next-export-optimize-images/image";
import { w_md } from "../../../tailwind.config";

type Props = {
  artworks: Array<artData>;
};

export default async function Gallery({ artworks }: Props) {
  return (
    <>
      <div className="grid grid-cols-3">
        {artworks.map((artwork) => (
          <div key={artwork.slug}>
            <Link href={"/artworks/" + artwork.slug}>
              <Image
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
