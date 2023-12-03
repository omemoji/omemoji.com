import Link from "next/link";
import { IoArrowBackCircleOutline } from "react-icons/io5";
type Props = {
  url: string;
};

export default function Back({ url }: Props) {
  return (
    <div className="h-16 flex  border-t border-[color:var(--border)]">
      <div className="hover:bg-gray-400/30 transition-colors px-2">
        <Link href={url} className="flex h-full">
          <IoArrowBackCircleOutline size={24} className="mr-2 my-auto" />
          <p className=" my-auto">Back </p>
        </Link>
      </div>
    </div>
  );
}
