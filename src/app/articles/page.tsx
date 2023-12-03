import { getArticlesData } from "lib/fs";
import ArticlesList from "components/ArticlesList";
import Top from "components/Top";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Articles | 創作物紹介",
  description: "omemoji's tech blog",
  openGraph: {
    title: "Articles | 創作物紹介",
    description: "omemoji's tech blog",
    url: `/articles`,
    type: "website",
    images: {
      url: `/omemoji.png`,
      width: 512,
      height: 512,
    },
  },
  twitter: {
    card: "summary",
    title: "Articles | 創作物紹介",
    description: "omemoji's tech blog",
    images: `/omemoji.png`,
    site: "@omemoji_art",
    creator: "@omemoji_art",
  },
};
export default async function Articles() {
  const articlesData = await getArticlesData("content/articles");
  return (
    <>
      <Top
        src="/omemoji.png"
        title="Articles"
        category="Articles"
        description="日記や技術的な記事など"
      />
      <ArticlesList articles={articlesData} />
    </>
  );
}
