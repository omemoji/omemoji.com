import Gallery from "components/Gallery";
import Top from "components/Top";
import { artworks } from "lib/data";
import { Metadata } from "next";
import PageBar from "components/PageBar";
import { ARTWORKS_NUMBER } from "lib/constant";
export const metadata: Metadata = {
  title: "Artworks | 創作物紹介",
  description: "omemoji's artworks",
  openGraph: {
    title: "Artworks | 創作物紹介",
    description: "omemoji's artworks",
    url: `/artworks`,
    type: "website",
    images: {
      url: `/omemoji.png`,
      width: 512,
      height: 512,
    },
  },
  twitter: {
    card: "summary",
    title: "Artworks | 創作物紹介",
    description: "omemoji's artworks",
    images: `/omemoji.png`,
    site: "@omemoji_art",
    creator: "@omemoji_art",
  },
};

export default function Artworks() {
  const artworks_shown = artworks.filter(
    (artwork) =>
      0 <= artworks.indexOf(artwork) &&
      artworks.indexOf(artwork) < ARTWORKS_NUMBER
  );
  return (
    <>
      <Top
        src="/omemoji.png"
        title="Artworks"
        category="Artworks"
        description="omemoji's artworks"
      />

      <Gallery className="" artworks={artworks_shown} />
      <PageBar
        current={1}
        pages={[...Array(Math.ceil(artworks.length / ARTWORKS_NUMBER))].map(
          (_, i) => i + 1
        )}
        category="artworks"
      />
    </>
  );
}
