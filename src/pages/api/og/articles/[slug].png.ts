import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { CollectionEntry } from "astro:content";

import ogImage from "@/components/OgImage";

const articles: CollectionEntry<"articles">[] = await getCollection(
  "articles",
  ({ data }) => {
    return import.meta.env.PROD ? data.published : true;
  }
);

export const GET: APIRoute = async ({ params }) => {
  let res = new Response("Not found", { status: 404 });
  const { slug } = params;
  const article = articles.find((post) => `${post.id}` === slug);
  if (article) {
    const img = await ogImage(article.data.title);
    res = new Response(new Uint8Array(img));
  }
  return res;
};

export async function getStaticPaths() {
  const ogEntries = [
    ...articles.map((article) => ({
      params: { slug: `${article.id}` },
    })),
  ];
  return ogEntries;
}
