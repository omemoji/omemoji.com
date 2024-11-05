import withExportImages from "next-export-optimize-images";

/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    deviceSizes: [480, 800],
    imageSizes: [480, 800],
  },
};

export default withExportImages(nextConfig);
// export default nextConfig;
