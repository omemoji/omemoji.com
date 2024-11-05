/**
 * @type {import('next-export-optimize-images').Config}
 */
const config = {
  quality: 50,
  // convertFormat: [
  //   ["png", "avif"],
  //   ["jpg", "avif"],
  // ],
  images: {
    deviceWidths: [480, 720, 1200, 1920],
  },
  generateFormats: ["avif"],
};

module.exports = config;
