import artworks_json from "../data/db.json";
import { ARTWORKS_PER_PAGE } from "./constant";

const { artworks } = JSON.parse(JSON.stringify(artworks_json));

export interface ArtworkData {
  id: string;
  src: string;
  title: string;
  tag: string[];
  href?: string;
  description?: string;
}

export const getThumbnailSize = (image: ImageMetadata, image_size: number) => {
  const w = image.width;
  const h = image.height;
  if (w > h) {
    return {
      src: image,
      width: image_size * (w / h),
      height: image_size,
    };
  } else {
    return {
      src: image,
      width: image_size,
      height: image_size * (h / w),
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
