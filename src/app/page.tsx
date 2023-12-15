import Top from "components/Top";
import compiler from "lib/compiler";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "創作物紹介",
  description: "omemoji's portfolio",
  openGraph: {
    title: "創作物紹介",
    description: "omemoji's portfolio",
    url: `/`,
    type: "website",
    images: {
      url: `/omemoji.png`,
      width: 512,
      height: 512,
    },
  },
  twitter: {
    card: "summary",
    title: "創作物紹介",
    description: "omemoji's portfolio",
    images: `/omemoji.png`,
    site: "@omemoji_art",
    creator: "@omemoji_art",
  },
};

export default async function Home() {
  const md = await fetch(
    "https://raw.githubusercontent.com/omemoji/omemoji/main/README.md"
  )
    .then((res) => res.text())
    .then((text) => text.substring(text.indexOf("## Profile")));

  const { content } = await compiler(md);
  return (
    <>
      <Top
        src="/omemoji.png"
        title="omemoji"
        category="About"
        description="This is omemoji's portfolio."
      />
      <article>{content}</article>
    </>
  );
}
