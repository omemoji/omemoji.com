type Props = {
  /** 一覧の基点。`/articles` や `/artworks/tag/Dragon` */
  basePath: string;
  /** 1 始まり */
  page: number;
  pageCount: number;
};

const Chevron = ({ back }: { back: boolean }) => (
  <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" focusable="false">
    <path
      d={back ? "M15 4 L7 12 L15 20" : "M9 4 L17 12 L9 20"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * ページ送り。
 *
 * URL の組み立て規則は routes.ts の paginateRoutes と同じで、
 * 1 ページ目だけ番号を付けない。ずれるとリンク先が存在しなくなる。
 */
export default function PageBar({ basePath, page, pageCount }: Props) {
  const linkTo = (target: number) => (target === 1 ? basePath : `${basePath}/${target}`);

  return (
    <nav className="page-bar" aria-label="ページ送り">
      <ul>
        <li>
          {page > 1 ? (
            <a href={linkTo(page - 1)} aria-label="前のページ">
              <Chevron back />
            </a>
          ) : (
            <span className="page-bar-disabled">
              <Chevron back />
            </span>
          )}
        </li>
        <li className="page-bar-count">
          {page} / {pageCount}
        </li>
        <li>
          {page < pageCount ? (
            <a href={linkTo(page + 1)} aria-label="次のページ">
              <Chevron back={false} />
            </a>
          ) : (
            <span className="page-bar-disabled">
              <Chevron back={false} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
