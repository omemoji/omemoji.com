import Link from "next/link";

export type Props = {
  emoji: string;
  title: string;
  tags: string[];
  date?: string;
};

export default async function TopArticle({ emoji, title, tags, date }: Props) {
  return (
    <div className="top-article mb-8">
      <p className="mb-4 mx-auto emoji text-center leading-relaxed">{emoji}</p>
      <h1 className="text-2xl xs:text-3xl mt-8 mb-2">{title}</h1>
      <div className="flex justify-center mb-4 ">
        {tags.map((tag) => (
          <p key={tag}>
            <Link href={"/articles/tag/" + tag} className="tag text-xl">
              {"#" + tag}
            </Link>
          </p>
        ))}
      </div>
      <p className="text-center text-xl mb-8">Published: {date}</p>
    </div>
  );
}
