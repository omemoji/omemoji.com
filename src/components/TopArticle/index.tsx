import Link from "next/link";

export type Props = {
  emoji: string;
  title: string;
  tags: string[];
  date?: string;
};

export default async function TopArticle({ emoji, title, tags, date }: Props) {
  return (
    <div className="top-article mb-8 text-center">
      <p className="mb-4 mx-auto emoji leading-relaxed">{emoji}</p>
      <h1 className="text-2xl xs:text-3xl mt-8 mb-2">{title}</h1>
      <div className="inline-block  mb-4 ">
        {tags.map((tag) => (
          <Link key={tag} href={"/articles/tag/" + tag} className="tag text-xl">
            {"#" + tag}
          </Link>
        ))}
      </div>
      <p className="text-xl mb-8">Published: {date}</p>
    </div>
  );
}
