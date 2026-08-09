import path from "node:path";

import { loadArtworks } from "@/content/artworks";

type Route = {
  path: string;
  page: string;
};

const artworksRoutes: Route[] = loadArtworks(
  path.join(import.meta.dirname, "../content/artworks")
).map((artwork) => ({
  path: `/artworks/${artwork.id}`,
  page: "ArtworkPage",
}));

export const routes: Route[] = [
  { path: "/", page: "About" },
  { path: "/artworks", page: "ArtworksList" },
  ...artworksRoutes,
];
