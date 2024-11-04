import Gallery from "components/Gallery";
import { artworks } from "lib/data";
import Top from "components/Top";
import type { Metadata } from "next";
import { ARTWORKS_NUMBER } from "lib/constant";
import PageBar from "components/PageBar";
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
      url: `/artworks/tag/${tag}`,
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
  const artworks_shown = tagged_artworks.filter(
    (artwork) =>
      0 <= tagged_artworks.indexOf(artwork) &&
      tagged_artworks.indexOf(artwork) < ARTWORKS_NUMBER
  );
  return (
    <>
      <Top
        src="/omemoji.png"
        title={"#" + tag}
        category="Artworks"
        description={"Tag: " + tag}
      />

      <Gallery artworks={artworks_shown} />
      <PageBar
        current={1}
        pages={[
          ...Array(Math.ceil(tagged_artworks.length / ARTWORKS_NUMBER)),
        ].map((_, i) => i + 1)}
        category={`artworks/tag/${tag}`}
      />
    </>
  );
}

// export const dynamicParams = false;

export async function generateStaticParams() {
  const data = Array.from(new Set(artworks.flatMap((d) => d.tag ?? []))).sort();
  return data.map((tag) => {
    return {
      tag,
    };
  });
}
