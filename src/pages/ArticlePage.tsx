import ArticleToc from "@/components/ArticleToc";
import Back from "@/components/Back";
import { markdownComponents } from "@/components/MarkdownComponent";
import TopArticle from "@/components/TopArticle";
import { imageBase } from "@/features/image/assets";
import { collectHeadings } from "@/features/markdown/headings";
import { hasCode } from "@/features/markdown/highlight";
import { hasMath } from "@/features/markdown/math";
import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";
import Layout from "@/layouts/Layout";
import type { PageProps } from "@/routes";

/**
 * 記事ページ。Markdown の変換が非同期のため、要素を Promise で返す。
 * ビルド側が await してから静的マークアップへ流す。
 */
export default async function ArticlePage({ article }: PageProps["ArticlePage"]) {
  const tree = await mdToHast(article.body, { imageBase: imageBase("articles", article.slug) });
  const headings = collectHeadings(tree);

  return (
    <Layout
      title={`${article.title} | 創作物紹介`}
      description={article.description}
      category="Articles"
      path={`/articles/${article.slug}`}
      math={hasMath(tree)}
      code={hasCode(tree)}
    >
      <TopArticle
        emoji={article.emoji}
        title={article.title}
        tags={article.tags}
        date={article.date}
      />

      {/* 目次は article の外に置く。本文向けのリスト装飾を受けないようにするため */}
      <ArticleToc headings={headings} />

      <article>{toReact(tree, markdownComponents)}</article>

      <Back
        href="/articles"
        path={`/articles/${article.slug}`}
        title={`${article.title} | 創作物紹介`}
        tags={article.tags}
      />
    </Layout>
  );
}
