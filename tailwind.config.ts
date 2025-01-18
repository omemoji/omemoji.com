/** @type {import('tailwindcss').Config} */
import { WIDTH_MAIN } from "./src/lib/constant";
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "600px",
      md: WIDTH_MAIN.toString() + "px",
      md_article: (WIDTH_MAIN + 24).toString() + "px",
    },
    extend: {},
  },
  plugins: [],
};
