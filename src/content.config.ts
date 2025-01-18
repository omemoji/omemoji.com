// 1. `astro:content`からユーティリティをインポート
import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";
// 2. コレクションを定義
const articlesCollection = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/articles",
  }),
  schema: z.object({
    emoji: z.string(),
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    published: z.boolean(),
  }),
});
const aboutCollection = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/about",
  }),
  schema: z.object({
    /* ... */
  }),
});
export const collections = {
  articles: articlesCollection,
  about: aboutCollection,
};
