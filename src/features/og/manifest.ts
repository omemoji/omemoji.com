import type { OgImage, OgManifest } from "@/features/og/generate";

/**
 * 描画時に OGP 画像を引くための置き場。画像・リンクカードと同じ形。
 *
 * `<head>` を組むのは Layout だけなので、ページ側は何も渡さなくてよい。
 * 値が無いページは共通の画像へ倒れる（dev は生成しないため常にこちら）。
 * import 時に副作用は起こさない。
 */
let manifest: OgManifest = {};

/** 描画の前に呼ぶ。ステージ（generate）の出力をそのまま渡す */
export function setOgManifest(next: OgManifest): void {
  manifest = next;
}

/** 個別の OGP 画像を持たないページは undefined */
export function resolveOg(pagePath: string): OgImage | undefined {
  return manifest[pagePath];
}

/** テスト用 */
export function clearOgManifest(): void {
  manifest = {};
}
