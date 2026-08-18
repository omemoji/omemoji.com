export const WIDTH_MAIN = 700;
export const COUNT_PER_PAGE = 7;
export const ARTWORKS_PER_PAGE = 9;
export const HOST = "omemoji.com";

/**
 * コードブロックの CSS と JS の出力先。`out/` 直下からの相対パスで、URL でもある。
 *
 * 複製ではなくビルドが生成し（scripts/build.ts の writeCodeAssets）、
 * コードブロックのあるページだけが読む（layouts/Layout.tsx）。
 * 書き出す側と読む側が離れているため、綴りはここに 1 つだけ置く
 */
export const CODE_ASSETS = { css: "code.css", js: "code.js" };
