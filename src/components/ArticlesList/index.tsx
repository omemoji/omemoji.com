import { ArticleMeta } from "lib/interface";
import Link from "next/link";

type Props = {
  articles: ArticleMeta[];
};

export default async function Articles({ articles }: Props) {
  return (
    <>
      <article className="">
        {articles.map((article) => (
          <div
            key={article.slug}
            className="border border-[var(--border)] sm:flex w-full  px-8 py-4 rounded-[5px] my-8 "
          >
            <div className="  text-center my-8 sm:my-auto text-[80px] sm:text-[100px] sm:pr-8">
              {article.emoji}
            </div>
            <div>
              <h2 className="mt-0 text-lg xs:text-xl border-l-4 mb-4">
                <Link href={"/articles/" + article.slug}>{article.title}</Link>
              </h2>
              <p className="my-0">
                {article.description}
                <br />
                {article.date}
              </p>

              <div className=" inline-block ">
                {article.tags.map((tag) => (
                  <Link key={tag} href={"/articles/tag/" + tag} className="tag">
                    {"#" + tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </article>
    </>
  );
}
