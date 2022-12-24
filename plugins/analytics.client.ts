import VueGtag from "vue-gtag";

// Nuxtプラグインの登録
export default defineNuxtPlugin((nuxtApp) => {
  // ルーター取得
  const router = useRouter();

  // Vue登録
  nuxtApp.vueApp.use(
    VueGtag,
    {
      deferScriptLoad: true,
      appName: "創作物紹介", // サイトの名称
      pageTrackerScreenviewEnabled: true, // ページトラッキングスクリーンビューを有効
      config: { id: `G-16EGCD4LQV` }, // GoogleAnalytics(GA4)の測定IDを指定する
    },
    router
  );
});
