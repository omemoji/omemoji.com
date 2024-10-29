import type { Config } from "tailwindcss";

const w_md: number = 752;

const config: Config = {
  content: [
    "./src/app/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "480px",
      sm: "600px",
      md: w_md.toString() + "px",
      md_article: (w_md+24).toString() + "px",
    },
    extend: {},
  },
  plugins: [],
};
export default config;
