import ShareButton from "@/components/ShareButton";
import type { Tag } from "@/content/tags";

type Props = {
  /** 戻り先の一覧 */
  href: string;
  /** 共有するページ自身のパス */
  path: string;
  title: string;
  tags: readonly Tag[];
};

/** 一覧へ戻る導線と共有ボタンを並べた帯 */
export default function Back({ href, path, title, tags }: Props) {
  return (
    <div className="back">
      <a className="back-link" href={href}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M13 8 L9 12 L13 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </a>
      <ShareButton path={path} title={title} tags={tags} />
    </div>
  );
}
