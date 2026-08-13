import { resolveLinkCard } from "@/features/link-card/manifest";
import { shortenUrl } from "@/features/link-card/parse";

/**
 * 段落に裸で置かれた外部リンクのカード表示。
 *
 * 取得結果はビルド前段のステージが用意する。**取得できていない URL は素のリンクに倒す**。
 * dev はキャッシュにある分だけカードになり、無いものはここで素のリンクになる
 */
export default function LinkCard({ href }: { href: string }) {
  const card = resolveLinkCard(href);

  if (!card) {
    return <a href={href}>{href}</a>;
  }

  return (
    <a className="link-card" href={href} target="_blank" rel="noopener">
      <span className="link-card-body">
        <span className="link-card-title">{card.title}</span>
        <span className="link-card-description">{card.description}</span>
        <span className="link-card-url">{shortenUrl(href)}</span>
      </span>

      {card.image && (
        <img
          className="link-card-image"
          src={card.image.src}
          width={card.image.width}
          height={card.image.height}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
    </a>
  );
}
