import type { Article } from "@/collections/articles";

type Props = Pick<Article, "emoji" | "title" | "tags" | "date">;

/** 記事の見出し部。絵文字・タイトル・タグ・公開日 */
export default function TopArticle({ emoji, title, tags, date }: Props) {
  return (
    <div className="top-article">
      <p className="emoji">{emoji}</p>
      <h1>{title}</h1>
      <div className="top-article-tags">
        {tags.map((tag) => (
          <a key={tag} className="tag" href={encodeURI(`/articles/tag/${tag}`)}>
            {`#${tag}`}
          </a>
        ))}
      </div>
      {/* ビルド環境の時差に依らないよう UTC で取り出す */}
      <p>Published: {date.toISOString().slice(0, 10)}</p>
    </div>
  );
}
