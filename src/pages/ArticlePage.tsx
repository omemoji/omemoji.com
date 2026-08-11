import ArticleToc from "@/components/ArticleToc";
import { markdownComponents } from "@/components/MarkdownComponent";
import TopArticle from "@/components/TopArticle";
import { collectHeadings } from "@/features/markdown/headings";
import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";
import Layout from "@/layouts/Layout";
import type { PageProps } from "@/routes";

/**
 * 記事ページ。Markdown の変換が非同期のため、要素を Promise で返す。
 * ビルド側が await してから静的マークアップへ流す。
 */
export default async function ArticlePage({ article, older, newer }: PageProps["ArticlePage"]) {
  const tree = await mdToHast(article.body);
  const headings = collectHeadings(tree);

  return (
    <Layout
      title={`${article.title} | 創作物紹介`}
      description={article.description}
      category="Articles"
      path={`/articles/${article.slug}`}
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

      <nav className="article-nav" aria-label="前後の記事">
        {older ? (
          <a className="article-nav-older" href={`/articles/${older.slug}`}>
            <span>前の記事</span>
            {older.title}
          </a>
        ) : null}
        {newer ? (
          <a className="article-nav-newer" href={`/articles/${newer.slug}`}>
            <span>次の記事</span>
            {newer.title}
          </a>
        ) : null}
      </nav>
    </Layout>
  );
}
