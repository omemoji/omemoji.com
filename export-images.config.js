/**
 * @type {import('next-export-optimize-images').Config}
 */
const config = {
  quality: 50,
  convertFormat: [
    ["png", "avif"],
    ["jpg", "avif"],
  ],
};

module.exports = config;
