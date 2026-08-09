import { ARTWORKS_PER_PAGE } from "@/config";
import artworks_json from "../data/db.json";

const { artworks } = JSON.parse(JSON.stringify(artworks_json));

export interface ArtworkData {
  id: string;
  src: string;
  title: string;
  tag: string[];
  href?: string;
  description?: string;
}

export const getThumbnailSize = (width: number, height: number, image_size: number) => {
  if (width > height) {
    return {
      width: image_size * (width / height),
      height: image_size,
    };
  } else {
    return {
      width: image_size,
      height: image_size * (height / width),
    };
  }
};

export const getArtworks = (): ArtworkData[] => {
  return artworks.toReversed();
};

export const getArtworksShown = (p: number): ArtworkData[] => {
  return getArtworks().filter(
    (artwork) =>
      (p - 1) * ARTWORKS_PER_PAGE <= getArtworks().indexOf(artwork) &&
      getArtworks().indexOf(artwork) < p * ARTWORKS_PER_PAGE
  );
};

export const getTaggedArtworks = (tag: string): ArtworkData[] => {
  return getArtworks().filter((artwork) => artwork.tag.includes(tag));
};

export const getTaggedArtworksShown = (tag: string, p: number): ArtworkData[] => {
  return getTaggedArtworks(tag).filter(
    (artwork) =>
      (p - 1) * ARTWORKS_PER_PAGE <= getTaggedArtworks(tag).indexOf(artwork) &&
      getTaggedArtworks(tag).indexOf(artwork) < p * ARTWORKS_PER_PAGE
  );
};
