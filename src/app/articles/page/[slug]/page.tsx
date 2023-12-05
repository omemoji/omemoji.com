import PageBar from "components/PageBar";
import ArticlesList from "components/ArticlesList";
import Top from "components/Top";
import type { Metadata } from "next";
import { COUNT_PER_PAGE } from "lib/constant";
import { getArticlesData } from "lib/fs";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;

  return {
    title: `Articles | 創作物紹介`,
    description: `articles: page=${slug}`,
    openGraph: {
      title: `Articles | 創作物紹介`,
      description: `Page: ${slug}`,
      url: `/articles/page/${slug}`,
      type: "website",
      images: {
        url: `/omemoji.png`,
        width: 512,
        height: 512,
      },
    },
    twitter: {
      card: "summary",
      title: `Articles | 創作物紹介`,
      description: `Page: ${slug}`,
      images: `/omemoji.png`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

export default async function ArticlesPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const slug_number = Number(slug);
  const articlesData = await getArticlesData("content/articles");
  const articles_shown = articlesData.filter(
    (artwork) =>
      COUNT_PER_PAGE * (slug_number - 1) <= articlesData.indexOf(artwork) &&
      articlesData.indexOf(artwork) < COUNT_PER_PAGE * slug_number
  );

  return (
    <>
      <Top
        src="/omemoji.png"
        title="Articles"
        category="Articles"
        description="日記や技術的な記事など"
      />
      <ArticlesList articles={articles_shown} />

      <PageBar
        current={slug_number}
        pages={[...Array(Math.ceil(articlesData.length / COUNT_PER_PAGE))].map(
          (_, i) => i + 1
        )}
        category="articles"
      />
    </>
  );
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const articlesData = await getArticlesData("content/articles");
  const data = [...Array(Math.ceil(articlesData.length / COUNT_PER_PAGE))].map(
    (_, i) => (i + 1).toString()
  );
  return data.map((slug) => {
    if (Number(slug) !== 1) {
      return {
        slug,
      };
    }
  });
}
