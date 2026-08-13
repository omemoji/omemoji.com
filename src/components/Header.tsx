/** ヘッダのメニュー。category が一致する項目を現在地として示す */
const menus = [
  { category: "About", href: "/" },
  { category: "Artworks", href: "/artworks" },
  { category: "Articles", href: "/articles" },
] as const;

export type Category = (typeof menus)[number]["category"];

/** category を省くとどのメニューも現在地にならない（404 など、一覧に属さないページ） */
export default function Header({ category }: { category?: Category | undefined }) {
  return (
    <header className="site-header">
      <h2 className="site-title">
        <a href="/">創作物紹介</a>
      </h2>
      <ul className="site-nav">
        {menus.map((menu) => (
          <li key={menu.category}>
            {/* 現在地は class ではなく aria-current で表し、下線は CSS 側で描く */}
            <a href={menu.href} aria-current={menu.category === category ? "page" : undefined}>
              {menu.category}
            </a>
          </li>
        ))}
      </ul>
    </header>
  );
}
