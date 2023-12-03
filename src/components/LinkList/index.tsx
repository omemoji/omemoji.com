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
    name: "Github",
    icon: <FaGithub className={iconClass} size={iconSize} />,
    href: "https://github.com/omemoji",
  },
  {
    name: "Instagram",
    icon: <FaInstagram className={iconClass} size={iconSize} />,
    href: "https://instagram.com/omemoji",
  },
  {
    name: "X(Twitter)",
    icon: <FaXTwitter className={iconClass} size={iconSize} />,
    href: "https://twitter.com/omemoji_art",
  },
  {
    name: "Zenn",
    icon: <SiZenn className={iconClass} size={iconSize} />,
    href: "https://zenn.dev/omemoji",
  },
  {
    name: "Pixiv",
    icon: <SiPixiv className={iconClass} size={iconSize} />,
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
        <div key={link.name}>
          <Link className="w-8" href={link.href}>
            {link.icon}
          </Link>
        </div>
      ))}
    </div>
  );
}
