import LinkCard from "components/LinkCard";
import NextImage from "components/NextImage";
// import Link from "next/link";

import type { LinkCardProps } from "components/LinkCard";
import type { NextImageProps } from "components/NextImage";
// import type { LinkProps } from "next/link";
import type { MDXComponents } from "mdx/types";

type ProvidedComponents = MDXComponents & {
  img: typeof NextImage;
  linkcard: typeof LinkCard;
};

const replaceComponents = {
  img: (props: NextImageProps) =>
    props.alt.startsWith("top:") ? (
      <NextImage
        {...props}
        className="content-image"
        alt={props.alt.substring(4)}
        priority={true}
      />
    ) : props.alt.startsWith("caption:") ? (
      <NextImage
        {...props}
        className="content-image"
        alt={props.alt.substring(8)}
        priority={false}
      />
    ) : !props.src.startsWith("http") ? (
      <NextImage {...props} classNameCaption="hidden" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...props} alt={props.alt} loading="lazy" />
    ),
  linkcard: (props: LinkCardProps) => <LinkCard {...props} />,
} as ProvidedComponents;

export default replaceComponents;
