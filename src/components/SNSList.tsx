import { type SimpleIcon, siGithub, siInstagram, siPixiv, siX, siZenn } from "simple-icons";

const snsList: { icon: SimpleIcon; href: string }[] = [
  { icon: siGithub, href: "https://github.com/omemoji" },
  { icon: siInstagram, href: "https://instagram.com/omemoji" },
  { icon: siX, href: "https://x.com/omemoji_art" },
  { icon: siZenn, href: "https://zenn.dev/omemoji" },
  { icon: siPixiv, href: "https://www.pixiv.net/users/65949346" },
];

/**
 * SNS へのリンク。
 *
 * simple-icons が持つのは SVG の文字列なので、そのまま埋め込む。
 * 中身はビルド時に決まる定数で、外部入力は混ざらない。
 * 塗りは CSS の fill から与えるため、アイコン側の色（icon.hex）は使わない。
 */
export default function SNSList() {
  return (
    <div className="sns-list">
      {snsList.map((sns) => (
        <a
          key={sns.href}
          href={sns.href}
          target="_blank"
          rel="noopener"
          aria-label={sns.icon.title}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: simple-icons が同梱する静的な SVG
          dangerouslySetInnerHTML={{ __html: sns.icon.svg }}
        />
      ))}
    </div>
  );
}
