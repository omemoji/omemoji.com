export interface ArticleMeta {
  emoji: string;
  slug: string;
  title: string;
  date?: string;
  description: string;
  tags: string[];
}
export interface ArticleData {
  preview: string;
  data: ArticleMeta | undefined;
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
