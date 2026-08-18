export const WIDTH_MAIN = 700;
export const COUNT_PER_PAGE = 7;
export const ARTWORKS_PER_PAGE = 9;
export const HOST = "omemoji.com";

/**
 * 指紋を付けて書き出す資産の論理名。`out/` 直下からの相対パス。
 *
 * **実際に配信される URL はこれではない。** ビルドは内容から求めた指紋を混ぜた名前
 * （`globals.<指紋>.css`）で書き出し、対応表を features/asset/manifest.ts へ渡す。
 * 読む側は `assetUrl()` を通すこと。dev サーバは指紋を付けず、この名前のまま返す。
 *
 * 書き出す側（scripts/build.ts の writeAssets）と読む側（layouts/Layout.tsx）が
 * 離れているため、綴りはここに 1 つだけ置く
 */
export const STYLESHEET = "globals.css";
export const KATEX_CSS = "katex/katex.min.css";
export const CODE_ASSETS = { css: "code.css", js: "code.js" };
