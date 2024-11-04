import { artData } from "lib/data";
import Link from "next/link";
import Image from "next-export-optimize-images/image";

type Props = {
  className?: string;
  artworks: Array<artData>;
};

export default async function Gallery({ className, artworks }: Props) {
  return (
    <>
      <div className={className + " " + "gallery block"}>
        {artworks.map((artwork) => (
          <div key={artwork.slug} className="w-1/3 inline-block">
            <Link href={"/artworks/" + artwork.slug}>
              <Image
                className="m-0 aspect-square object-cover"
                src={artwork.src}
                quality={20}
                width={256}
                height={256}
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
