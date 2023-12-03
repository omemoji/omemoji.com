import Gallery from "components/Gallery";
import { artworks } from "lib/data";
import Top from "components/Top";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: { tag: string };
}): Promise<Metadata> {
  const { tag } = params;
  return {
    title: `Artworks: ${tag} | 創作物紹介`,
    description: `artworks with tag ${tag}`,
    openGraph: {
      title: `Artworks: ${tag} | 創作物紹介`,
      description: `artworks with tag ${tag}`,
      url: `/artworks/${tag}`,
      type: "website",
      images: {
        url: `/omemoji.png`,
        width: 512,
        height: 512,
      },
    },
    twitter: {
      card: "summary",
      title: `Artworks: ${tag} | 創作物紹介`,
      description: `artworks with tag ${tag}`,
      images: `/omemoji.png`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

export default async function ArtworksTag({
  params,
}: {
  params: { tag: string };
}) {
  const { tag } = params;
  const tagged_artworks = artworks.filter((artwork) =>
    artwork.tag.includes(tag)
  );

  return (
    <>
      <Top
        src="/omemoji.png"
        title={"#" + tag}
        category="Artworks"
        description={"Tag: " + tag}
      />

      <Gallery className="" artworks={tagged_artworks} />
    </>
  );
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const data = Array.from(new Set(artworks.flatMap((d) => d.tag ?? []))).sort();
  return data.map((tag) => {
    return {
      tag,
    };
  });
}
