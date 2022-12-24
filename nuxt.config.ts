// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  ssr: true,
  experimental: {
    payloadExtraction: false,
  },
  app: {
    baseURL: "/",
    head: {
      titleTemplate: "%s | 創作物紹介",
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        {
          rel: "apple-touch-icon",
          href: "https://omemoji.com/omemoji.png",
        },
      ],
      htmlAttrs: {
        lang: "ja",
        prefix: "og: http://ogp.me/ns#",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "format-detection", content: "telephone=no" },
        {
          hid: "description",
          name: "description",
          content: "omemoji's portfolio website",
        },
        {
          property: "og:site_name",
          content: "創作物紹介",
        },
        { hid: "og:type", property: "og:type", content: "website" },
        { hid: "og:url", property: "og:url", content: "https://omemoji.com/" },
        { hid: "og:title", property: "og:title", content: "創作物紹介" },
        {
          hid: "og:description",
          property: "og:description",
          content: "omemoji's portfolio website",
        },
        {
          hid: "og:image",
          property: "og:image",
          content: "https://omemoji.com/omemoji.png",
        },
        { name: "twitter:card", content: "summary" },
        {
          hid: "twitter:image",
          name: "twitter:image",
          content: "https://omemoji.com/omemoji.png",
        },
        {
          name: "twitter:site",
          content: "@omemoji_itf",
        },
      ],
    },
  },
  modules: ["@nuxt/image-edge", "@nuxt/content"],
  content: {
    // https://content.nuxtjs.org/api/configuration
  },
  // components: true,
  components: true,
  css: [
    "~/assets/css/main.css",
    "github-markdown-css/github-markdown-light.css",
  ],
  image: {
    providers: {
      customProvider: {
        name: "ipx_fixed", // optional value to overrider provider name
        provider: "~/providers/custom/ipx_fixed.ts", // Path to custom provider
        options: {},
      },
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
});
