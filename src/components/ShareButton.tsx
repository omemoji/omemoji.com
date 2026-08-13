import { siX } from "simple-icons";

import { HOST } from "@/config";
import { type Tag, tagLabels } from "@/content/tags";

type Props = {
  /** 共有するページのパス。先頭が `/` */
  path: string;
  title: string;
  tags: readonly Tag[];
};

/** X の投稿画面を開く。日本語表現を持つタグは、そちらもハッシュタグに足す */
export default function ShareButton({ path, title, tags }: Props) {
  const hashtags = [...tags, ...tags.map((tag) => tagLabels[tag]).filter((label) => label)];
  const url = new URL("https://x.com/intent/post");
  url.searchParams.set("url", `https://${HOST}${path}`);
  url.searchParams.set("text", title);
  url.searchParams.set("hashtags", ["創作物紹介", ...hashtags].join(","));

  return (
    <a
      className="share-button"
      href={url.toString()}
      target="_blank"
      rel="noopener"
      aria-label="X で共有する"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: simple-icons が同梱する静的な SVG
      dangerouslySetInnerHTML={{ __html: siX.svg }}
    />
  );
}
