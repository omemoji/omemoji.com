import type { APIRoute } from "astro";
import { getArtworks } from "@/lib/artworks";
import ogArtworkImage from "@/components/OgArtworkImage";

const artworks = getArtworks();

export const GET: APIRoute = async ({ params }) => {
  let res = new Response("Not found", { status: 404 });
  const { slug } = params;
  const artwork = artworks.find((artwork) => `${artwork.id}` === slug);
  if (artwork) {
    const img = await ogArtworkImage(artwork.title, artwork.src);
    res = new Response(new Uint8Array(img));
  }
  return res;
};

export async function getStaticPaths() {
  const ogEntries = [
    ...artworks.map((artwork) => ({
      params: { slug: `${artwork.id}` },
    })),
  ];
  return ogEntries;
}
