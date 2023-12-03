import Icon from "components/Icon";
import Link from "next/link";

export const menus = [
  { title: "omemoji", category: "About", emoji: "👤", href: "/" },
  { title: "Artworks", category: "Artworks", emoji: "🎨", href: "/artworks" },
  { title: "Articles", category: "Articles", emoji: "🖊", href: "/articles" },
];

export type Props = {
  src: string;
  title: string;
  category?: string;
  description?: string;
  hidden?: boolean;
};

export default async function Top({
  src,
  title,
  description,
  category,
}: Props) {
  return (
    <div>
      <div className="py-8 sm:flex  justify-center  ">
        <Icon src={src} className="mx-auto my-auto sm:mx-2" />

        <div className="sm:w-72 my-auto text-center mx-auto sm:mx-0">
          <h1 className="sm:text-4xl">{title}</h1>
          <p className=" text-xl px-4 ">{description}</p>
        </div>
      </div>
      <ul className="flex w-full  border-b border-[color:var(--border)] mx-auto">
        {menus.map((menu) => (
          <li
            key={menu.title}
            className="w-1/3 hover:bg-gray-400/30 transition-colors"
          >
            <Link href={menu.href} className="">
              {menu.category == category ? (
                <>
                  <p className="text-center text-[color:var(--fg)] font-bold text-lg xs:text-2xl py-3  leading-normal">
                    {menu.category}
                  </p>
                  <div className="bg-[color:var(--link)] rounded-full h-1 w-1/2 mx-auto"></div>
                </>
              ) : (
                <p className="text-center text-[color:var(--menu)] text-lg xs:text-2xl py-3  leading-normal">
                  {menu.category}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
