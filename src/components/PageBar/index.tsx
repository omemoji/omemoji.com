import Link from "next/link";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
type Props = {
  category: string;
  current: number;
  pages: number[];
};

export default function PageBar({ current, pages, category }: Props) {
  const slug = current - 1 !== 1 ? "page/" + (current - 1).toString() : "";
  return (
    <div className="h-24 flex  border-t border-[color:var(--border)]">
      <div className="mx-auto">
        <ul className="flex h-full">
          <li className="my-auto mx-2">
            {current !== 1 ? (
              <Link href={`/${category}/` + slug}>
                <IoIosArrowBack size={40} color="var(--fg)" />
              </Link>
            ) : (
              <IoIosArrowBack size={40} color="var(--bg-artwork)" />
            )}
          </li>

          <li className="my-auto mx-2 text-2xl">
            {current} / {pages.slice(-1)[0]}
          </li>

          <li className="my-auto mx-2">
            {current !== pages.slice(-1)[0] ? (
              <Link href={`/${category}/` + `page/${current + 1}`}>
                <IoIosArrowForward size={40} color="var(--fg)" />
              </Link>
            ) : (
              <IoIosArrowForward size={40} color="var(--bg-artwork)" />
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
