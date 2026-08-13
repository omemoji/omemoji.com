import ArticleCards from "@/components/ArticlesList";
import PageBar from "@/components/PageBar";
import Top from "@/components/Top";
import Layout from "@/layouts/Layout";
import type { PageProps } from "@/routes";

const DESCRIPTION = "日記や技術的な記事など";

export default function ArticlesList({ items, page, pageCount, tag }: PageProps["ArticlesList"]) {
  // routes.ts の paginateRoutes と同じ規則。ここがずれるとページ送りが 404 になる
  const basePath = tag === undefined ? "/articles" : `/articles/tag/${tag}`;

  return (
    <Layout
      title={`${tag ? `${tag}: ` : ""}Articles | 創作物紹介`}
      description={DESCRIPTION}
      category="Articles"
      path={page === 1 ? basePath : `${basePath}/${page}`}
    >
      <Top title={tag ? `#${tag}` : "Articles"} description={tag ? `Tag: ${tag}` : DESCRIPTION} />
      <ArticleCards articles={items} />
      <PageBar basePath={basePath} page={page} pageCount={pageCount} />
    </Layout>
  );
}
