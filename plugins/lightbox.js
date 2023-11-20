import Lightbox from "vue-easy-lightbox";
export default defineNuxtPlugin((nuxtApp) => {
  // Vue登録
  nuxtApp.vueApp.use(Lightbox);
});
