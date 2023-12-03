import Link from "next/link";
export default function Header() {
  return (
    <header className="h-20 flex px-4  md:px-0  ">
      <h2 className="border-none  font-bold my-auto text-xl px-0 xs:text-2xl">
        <Link href="/">創作物紹介</Link>
      </h2>

      <ul className="flex  ml-auto  my-auto ">
        <li className="text-lg xs:text-xl">
          <Link href="/artworks">Artworks</Link>
        </li>
        <li className="ml-4 text-lg xs:text-xl">
          <Link href="/articles">Articles</Link>
        </li>
      </ul>
    </header>
  );
}
