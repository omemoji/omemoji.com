import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiPixiv, SiZenn } from "react-icons/si";

type Props = {
  className?: string;
};

const iconClass = "ml-4";
const iconSize = "24px";

const linklist = [
  {
    icon: <FaGithub className={iconClass} size={iconSize} title="GitHub" />,
    href: "https://github.com/omemoji",
  },
  {
    icon: (
      <FaInstagram className={iconClass} size={iconSize} title="Instagram" />
    ),
    href: "https://instagram.com/omemoji",
  },
  {
    icon: (
      <FaXTwitter className={iconClass} size={iconSize} title="X (Twitter)" />
    ),
    href: "https://twitter.com/omemoji_art",
  },
  {
    icon: <SiZenn className={iconClass} size={iconSize} title="Zenn" />,
    href: "https://zenn.dev/omemoji",
  },
  {
    icon: <SiPixiv className={iconClass} size={iconSize} title="Pixiv" />,
    href: "https://www.pixiv.net/users/65949346",
  },
];

for (let i = 0; i < linklist.length; i++) {
  linklist[i].icon;
}

export default function LinkList({ className }: Props) {
  return (
    <div className={className + " " + "flex"}>
      {linklist.map((link) => (
        <div key={link.href}>
          <a className="w-8" href={link.href} target="_blank" rel="noopener">
            {link.icon}
          </a>
        </div>
      ))}
    </div>
  );
}
