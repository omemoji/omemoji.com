// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkGemoji from "remark-gemoji";
import remarkMath from "remark-math";
import remarkRuby from "remark-denden-ruby";
import sitemap from "@astrojs/sitemap";
import astroExpressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";

import remarkLinkcard from "./src/lib/remark-link-card";
// https://astro.build/config
export default defineConfig({
  outDir: "./out",
  build: {
    format: "file",
  },
  markdown: {
    remarkPlugins: [remarkGemoji, remarkRuby, remarkMath, remarkLinkcard],
    remarkRehype: {
      allowDangerousHtml: true,
      footnoteLabel: "脚注",
    },
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
        },
      ],
      rehypeKatex,
      rehypeUnwrapImages,
    ],
    syntaxHighlight: "shiki",
  },
  integrations: [
    astroExpressiveCode({
      themes: ["kanagawa-wave"],
      frames: {
        // Example: Hide the "Copy to clipboard" button
      },
      styleOverrides: {
        // You can also override styles

        frames: {
          frameBoxShadowCssValue: "none",
        },
      },
      plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
      defaultProps: {
        showLineNumbers: false,
        collapse: "25-9999",
      },
      shiki: {
        langs: [
          async () =>
            await fetch(
              "https://raw.githubusercontent.com/caddyserver/vscode-caddyfile/refs/heads/master/syntaxes/caddyfile.tmLanguage.json",
              { cache: "force-cache" }
            ).then((res) => res.json()),
        ],
      },
    }),
    tailwind(),
    mdx({ extendMarkdownConfig: true }),
    react(),
    sitemap({
      filter: (page) =>
        !page.includes("/artworks/tag") &&
        !page.includes("/articles/tag") &&
        !page.match(/\/artworks\/[0-9]+\//) &&
        !page.match(/\/articles\/[0-9]+\//),
    }),
  ],
  image: {
    remotePatterns: [{ protocol: "https" }],
  },
  site: "https://omemoji.com/",
  trailingSlash: "never",
  experimental: {
    svg: {
      mode: "inline",
    },
  },
});
