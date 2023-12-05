import Top from "components/Top";
import PageBar from "components/PageBar";
import { getTaggedArticlesData, getArticlesData } from "lib/fs";
import ArticlesList from "components/ArticlesList";
import { COUNT_PER_PAGE } from "lib/constant";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: { tag: string };
}): Promise<Metadata> {
  const { tag } = params;
  return {
    title: `Articles: ${tag} | 創作物紹介`,
    description: `articles with tag ${tag}`,
    openGraph: {
      title: `Articles: "${tag}" | 創作物紹介`,
      description: `articles with tag ${tag}`,
      url: `/articles/tag/${tag}`,
      type: "website",
      images: {
        url: `/omemoji.png`,
        width: 512,
        height: 512,
      },
    },
    twitter: {
      card: "summary",
      title: `Articles: ${tag} | 創作物紹介`,
      description: `articles with tag ${tag}`,
      images: `/omemoji.png`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

export default async function ArticlesTag({
  params,
}: {
  params: { tag: string };
}) {
  const { tag } = params;
  const tagged_articles = await getTaggedArticlesData("content/articles", tag);

  const articles_shown = tagged_articles.filter(
    (article) =>
      0 <= tagged_articles.indexOf(article) &&
      tagged_articles.indexOf(article) < COUNT_PER_PAGE
  );

  return (
    <>
      <Top
        src="/omemoji.png"
        title={"#" + tag}
        category="Articles"
        description={"Tag: " + tag}
      />
      <ArticlesList articles={articles_shown} />
      <PageBar
        current={1}
        pages={[
          ...Array(Math.ceil(tagged_articles.length / COUNT_PER_PAGE)),
        ].map((_, i) => i + 1)}
        category={`articles/tag/${tag}`}
      />
    </>
  );
}
export const dynamicParams = false;

export async function generateStaticParams() {
  const articles = await getArticlesData("content/articles");
  const data = Array.from(
    new Set(articles.flatMap((d) => d.tags ?? []))
  ).sort();
  return data.map((tag) => {
    return {
      tag,
    };
  });
}
