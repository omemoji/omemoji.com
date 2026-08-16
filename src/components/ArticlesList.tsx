import type { Article } from "@/collections/articles";

/**
 * 記事一覧のカード。絵文字・タイトル・説明・日付・タグ
 *
 * カードは div で組む。article 要素にすると本文向けの見出し装飾
 * （globals.css の `article h2` が引くアクセント下線）を拾ってしまう。
 */
export default function ArticlesList({ articles }: { articles: Article[] }) {
  return (
    <div className="article-cards">
      {articles.map((article) => (
        <div className="article-card" key={article.slug}>
          <p className="article-card-emoji">{article.emoji}</p>
          <div className="article-card-meta">
            <h2>
              <a href={`/articles/${article.slug}`}>{article.title}</a>
            </h2>
            <p>
              {article.description}
              <br />
              {/* ビルド環境の時差に依らないよう UTC で取り出す */}
              {article.date.toISOString().slice(0, 10)}
            </p>
            <div className="article-card-tags">
              {article.tags.map((tag) => (
                <a key={tag} className="tag" href={encodeURI(`/articles/tag/${tag}`)}>
                  {`#${tag}`}
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
