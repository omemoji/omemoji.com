import Gallery from "components/Gallery";
import PageBar from "components/PageBar";
import { artworks } from "lib/data";
import Top from "components/Top";
import type { Metadata } from "next";
import { ARTWORKS_NUMBER } from "lib/constant";
import { pageIdGen } from "lib/fs";
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;

  return {
    title: `Artworks | 創作物紹介`,
    description: `artworks: page=${slug}`,
    openGraph: {
      title: `Artworks | 創作物紹介`,
      description: `Page: ${slug}`,
      url: `/artworks/page/${slug}`,
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
      description: `Page: ${slug}`,
      images: `/omemoji.png`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

export default async function ArtworksPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const slug_number = Number(slug);
  const artworks_shown = artworks.filter(
    (artwork) =>
      ARTWORKS_NUMBER * (slug_number - 1) <= artworks.indexOf(artwork) &&
      artworks.indexOf(artwork) < ARTWORKS_NUMBER * slug_number
  );

  return (
    <>
      <Top
        src="/omemoji.png"
        title="Artworks"
        category="Artworks"
        description={"omemoji's artworks"}
      />

      <Gallery className="" artworks={artworks_shown} />
      <PageBar
        current={slug_number}
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
  return data.map((slug) => {
    return {
      slug,
    };
  });
}
