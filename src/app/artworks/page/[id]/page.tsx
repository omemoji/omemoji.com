import Gallery from "components/Gallery";
import PageBar from "components/PageBar";
import artworks_json from "data/db.json";
import Top from "components/Top";
import type { Metadata } from "next";
import { ARTWORKS_NUMBER } from "lib/constant";
import { pageIdGen } from "lib/fs";
import { ArtworkData } from "lib/interface";

const { artworks } = JSON.parse(JSON.stringify(artworks_json));

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = params;

  return {
    title: `Artworks | 創作物紹介`,
    description: `artworks: page=${id}`,
    openGraph: {
      title: `Artworks | 創作物紹介`,
      description: `Page: ${id}`,
      url: `/artworks/page/${id}`,
      type: "website",
      images: {
        url: `/omemoji.png`,
        width: 512,
        height: 512,
      },
    },
    twitter: {
      card: "summary",
      title: `Artworks | 創作物紹介`,
      description: `Page: ${id}`,
      images: `/omemoji.png`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

// 降順に並び替え

export default async function ArtworksPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const id_number = Number(id);
  const artworks_reversed: ArtworkData[] = artworks.toReversed();
  const artworks_shown = artworks_reversed.filter(
    (artwork) =>
      ARTWORKS_NUMBER * (id_number - 1) <= artworks_reversed.indexOf(artwork) &&
      artworks_reversed.indexOf(artwork) < ARTWORKS_NUMBER * id_number
  );

  return (
    <>
      <Top
        src="/omemoji.png"
        title="Artworks"
        category="Artworks"
        description={"omemoji's artworks"}
      />
      <Gallery artworks={artworks_shown} />
      <PageBar
        current={id_number}
        pages={[...Array(Math.ceil(artworks.length / ARTWORKS_NUMBER))].map(
          (_, i) => i + 1
        )}
        category="artworks"
      />
    </>
  );
}

// export const dynamicParams = false;

export async function generateStaticParams() {
  const data = pageIdGen(Math.ceil(artworks.length / ARTWORKS_NUMBER));
  return data.map((id) => {
    return {
      id,
    };
  });
}
