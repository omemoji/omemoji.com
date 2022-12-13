/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  theme: {
    screens: {
      laptop: "768px",
      xs: "480px",
      md: "768px",
    },
    container: {
      center: true,
    },
    extend: {},
  },
  plugins: [],
};
