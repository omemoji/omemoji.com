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
            className="border sm:flex w-full shadow-md px-8 py-4 rounded-lg my-8"
          >
            <div className="  text-center my-8 sm:my-auto text-[80px] sm:text-[100px] sm:pr-8">
              {article.emoji}
            </div>
            <div>
              <h2 className="mt-0 text-xl">
                <Link href={"/articles/" + article.slug}>{article.title}</Link>
              </h2>
              <p className="mb-0">
                {article.description}
                <br />
                {article.date}
              </p>

              <div className=" inline-block ">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={"/articles/tag/" + tag}
                    className="tag text-xl"
                  >
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
