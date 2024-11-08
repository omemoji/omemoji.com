// kkk
import Link from "next/link";
import artworks_json from "data/db.json";
import NextImage from "components/NextImage";
import { Metadata } from "next";
import Back from "components/Back";
import { ArtworkData } from "lib/interface";

const { artworks } = JSON.parse(JSON.stringify(artworks_json));

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = params;
  const artwork = artworks.find(
    (artwork: ArtworkData) => artwork.id === id
  ) ?? {
    id: "not_found",
    src: "/no-image.png",
    title: "Not Found",
    tag: [],
    href: "",
    description: "",
  };
  return {
    title: `${artwork.title}  | 創作物紹介`,
    description: `${artwork.description}`,
    openGraph: {
      title: `${artwork.title}  | 創作物紹介`,
      description: `${artwork.description}`,
      url: `/artworks/${artwork.id}`,
      type: "article",
      images: {
        url: `${artwork.src}`,
        width: 512,
        height: 512,
      },
    },
    twitter: {
      card: "summary",
      title: `${artwork.title}  | 創作物紹介`,
      description: `${artwork.description}`,
      images: `${artwork.src}`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

export default function Artwork({ params }: { params: { id: string } }) {
  const { id } = params;
  const artwork: ArtworkData = artworks.find(
    (artwork: ArtworkData) => artwork.id === id
  ) ?? {
    id: "not_found",
    src: "/no-image.png",
    title: "Not Found",
    tag: [],
    href: "",
    description: "",
  };

  return (
    <>
      <a href={artwork.src}>
        <NextImage
          alt={artwork.title}
          src={artwork.src}
          category="artwork"
          className="content-image"
          priority={true}
        />
      </a>

      <div className="pt-4 pb-8 caption">
        <div className="">
          <h1 className="xs:text-4xl">{artwork.title}</h1>
          <div className="flex justify-center mb-4">
            {artwork.tag.map((tag) => (
              <Link
                href={"/artworks/tag/" + tag}
                key={tag}
                className="tag text-2xl"
              >
                {"#" + tag}
              </Link>
            ))}
          </div>
          <p className=" text-center text-xl mx-auto px-4 ">
            {artwork.description}
          </p>
        </div>
      </div>
      <Back url="/artworks" />
      {/* 
      <Gallery
        artworks={artworks}
        className="border-t border-[color:var(--border)]"
      /> */}
    </>
  );
}

// export const dynamicParams = false;

export function generateStaticParams() {
  return artworks;
}
