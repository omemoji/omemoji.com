export interface ArticleMeta {
  emoji: string;
  slug: string;
  title: string;
  date?: string;
  description: string;
  tags: string[];
  published?: boolean;
}
export interface ArticleData {
  preview: string;
  data: ArticleMeta | undefined;
}

export interface ArtworkData {
  id: string;
  src: string;
  title: string;
  tag: string[];
  href?: string;
  description?: string;
}

const PageType = {
  Article: "article",
  Website: "website",
} as const;

type PageType = (typeof PageType)[keyof typeof PageType];

const TwCardType = {
  Summary: "summary",
  Summary_Large_Image: "summary_large_image",
} as const;

type TwCardType = (typeof TwCardType)[keyof typeof TwCardType];

export interface PageMetaData {
  title: string;
  sitename: string;
  description: string;
  ogImageUrl: string;
  pageRelPath: string;
  pagetype: PageType;
  twcardtype: TwCardType;
}
