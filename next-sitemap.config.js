/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: process.env.SITE_URL || "https://omemoji.com",
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: [
    "/artworks/tag/**/*",
    "/artworks/page/**/*",
    "/articles/tag/**/*",
    "/articles/page/**/*",
    "/artworks/tag/*",
    "/artworks/page/*",
    "/articles/tag/*",
    "/articles/page/*",
    "/admin",
  ],
  outDir: "./out",
};

module.exports = config;
