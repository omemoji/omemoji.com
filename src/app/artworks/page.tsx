import Gallery from "components/Gallery";
import Top from "components/Top";
import { artworks } from "lib/data";
import { Metadata } from "next";
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
  return (
    <>
      <Top
        src="/omemoji.png"
        title="Artworks"
        category="Artworks"
        description="omemoji's artworks"
      />

      <Gallery className="" artworks={artworks} />
    </>
  );
}
