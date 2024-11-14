import PageBar from "components/PageBar";
import ArticlesList from "components/ArticlesList";
import Top from "components/Top";
import type { Metadata } from "next";
import { COUNT_PER_PAGE } from "lib/constant";
import { getTaggedArticlesData, getTags, pageIdGen } from "lib/fs";
import NotFound from "app/not-found";

export async function generateMetadata({
  params,
}: {
  params: { tag: string; id: string };
}): Promise<Metadata> {
  const { tag, id } = params;
  return {
    title: `Articles: ${tag} | 創作物紹介`,
    description: `articles with tag ${tag}`,
    openGraph: {
      title: `Articles: "${tag}" | 創作物紹介`,
      description: `articles with tag ${tag}`,
      url: `/articles/tag/${tag}/page/${id}`,
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

export default async function ArticlesPage({
  params,
}: {
  params: { tag: string; id: string };
}) {
  if (params.tag === "undefined") {
    return NotFound();
  }

  const { tag, id } = params;
  const slug_number = Number(id);
  const tagged_articlesData = (
    await getTaggedArticlesData("content/articles", tag)
  ).filter(
    (article) =>
      article.published === true || process.env.NODE_ENV === "development"
  );

  const articles_shown = tagged_articlesData.filter(
    (article) =>
      COUNT_PER_PAGE * (slug_number - 1) <=
        tagged_articlesData.indexOf(article) &&
      tagged_articlesData.indexOf(article) < COUNT_PER_PAGE * slug_number
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
        pages={[
          ...Array(Math.ceil(tagged_articlesData.length / COUNT_PER_PAGE)),
        ].map((_, i) => i + 1)}
        category={`articles/tag/${tag}`}
      />
    </>
  );
}

// export const dynamicParams = false;

export async function generateStaticParams() {
  const tagData = await getTags("content/articles");
  const paths = await Promise.all(
    tagData.map(async (tag) => {
      const tagged_articlesData = await getTaggedArticlesData(
        "content/articles",
        tag
      );
      const data = pageIdGen(
        Math.ceil(tagged_articlesData.length / COUNT_PER_PAGE)
      );
      if (data.length !== 0) {
        return data.map((id) => ({
          tag,
          id: `${id}`,
        }));
      } else {
        return [{ tag: "undefined", id: "9999" }];
      }
    })
  );
  return paths.flat();
}
