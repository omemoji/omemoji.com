// kkk
import Link from "next/link";
import { artworks } from "lib/data";

import NextImage from "components/NextImage";
import { Metadata } from "next";
import Back from "components/Back";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  const artwork = artworks.find((artwork) => artwork.slug === slug) ?? {
    slug: "not_found",
    src: "/images/not_found",
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
      url: `/artworks/${artwork.slug}`,
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

export default function Artwork({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const artwork = artworks.find((artwork) => artwork.slug === slug) ?? {
    slug: "not_found",
    src: "/images/not_found",
    title: "Not Found",
    tag: [],
    href: "",
    description: "",
  };

  return (
    <>
      <Link href={artwork.src}>
        <NextImage
          alt={artwork.title}
          src={artwork.src}
          category="artwork"
          className="content-image"
          priority
        />
      </Link>

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

export const dynamicParams = false;

export function generateStaticParams() {
  return artworks;
}
