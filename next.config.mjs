import withExportImages from "next-export-optimize-images";

/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    deviceSizes: [480, 720, 1200, 1920],
    imageSizes: [480, 720, 1200, 1920],
  },
};

export default withExportImages(nextConfig);
// export default nextConfig;
