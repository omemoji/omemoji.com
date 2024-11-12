import TopArticle from "components/TopArticle";
import { getArticleContent, getArticlesData } from "lib/fs";
import type { Metadata } from "next";
import Back from "components/Back";
import "katex/dist/katex.min.css";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  const articlesData = await getArticlesData("content/articles");
  const article = articlesData.find((article) => article.slug === slug) ?? {
    emoji: "",
    slug: "not_found",
    title: "Not Found",
    tags: [],
    date: "1970-01-01",
    description: "",
  };
  return {
    title: `${article.title}  | 創作物紹介`,
    description: `${article.description}`,
    openGraph: {
      title: `${article.title} | 創作物紹介`,
      description: `${article.description}`,
      url: `/articles/${article.slug}`,
      type: "article",
      images: {
        url: `/omemoji.png`,
        width: 512,
        height: 512,
      },
    },
    twitter: {
      card: "summary",
      title: `${article.title}  | 創作物紹介`,
      description: `${article.description}`,
      images: `/omemoji.png`,
      site: "@omemoji_art",
      creator: "@omemoji_art",
    },
  };
}

export default async function Article({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const articlesData = await getArticlesData("content/articles");
  const article = articlesData.find((article) => article.slug === slug) ?? {
    emoji: "",
    slug: "not_found",
    title: "Not Found",
    tags: [],
    date: "1970-01-01",
    description: "",
    published: false,
  };

  const content = await getArticleContent(article.slug);

  return (
    <>
      <TopArticle
        emoji={article.emoji}
        title={article.title}
        date={article.date}
        tags={article.tags}
      />
      <article className="">{content}</article>
      <Back url="/articles" />
    </>
  );
}

// export const dynamicParams = false;

export async function generateStaticParams() {
  const articlesData = await getArticlesData("content/articles");
  const articles_publishing = articlesData.filter(
    (article) =>
      article.published !== false || process.env.NODE_ENV === "development"
  );
  return articles_publishing.map((article) => ({
    slug: article.slug,
  }));
}
