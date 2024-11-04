import withExportImages from "next-export-optimize-images";

/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
};

export default withExportImages(nextConfig);
// export default nextConfig;
