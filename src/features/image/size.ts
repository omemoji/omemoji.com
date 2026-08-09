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
