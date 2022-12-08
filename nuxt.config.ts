// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  app: {
    
    head: {
      titleTemplate: "創作物紹介",
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        {
          rel: "apple-touch-icon",
          href: "https://omemoji.dev/omemoji.png",
        },
      ],
      htmlAttrs: {
        lang: "en",
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
          hid: "og:site_name",
          property: "og:site_name",
          content: "創作物紹介",
        },
        { hid: "og:type", property: "og:type", content: "website" },
        { hid: "og:url", content: "https://omemoji.com/" },
        { hid: "og:title", property: "og:title", content: "omemoji"},
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
      ],
    },
    
  },
  modules: [
    '@nuxt/image-edge',
  ],
  image: {
  },
  css: ["~/assets/css/main.css",
],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  
});
