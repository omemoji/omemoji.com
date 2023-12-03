import Top from "components/Top";
import fs from "fs";
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
  const file = fs.readFileSync("./src/content/about.md", "utf-8");
  const { content } = await compiler(file);
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
