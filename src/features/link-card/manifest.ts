import type { LinkCard, LinkCardManifest } from "@/features/link-card/collect";

/**
 * 描画時にカードの中身を引くための置き場。画像のマニフェストと同じ形（features/image/manifest.ts）。
 *
 * Markdown の差し替え表は URL しか知らないため、取得結果はここから引く。
 * import 時に副作用は起こさない。値が無ければ素のリンクとして描画される
 */
let manifest: LinkCardManifest = {};

/** 描画の前に呼ぶ。ステージ（collect）の出力をそのまま渡す */
export function setLinkCardManifest(next: LinkCardManifest): void {
  manifest = next;
}

/** 取得できなかった URL・dev でキャッシュに無い URL は undefined */
export function resolveLinkCard(url: string): LinkCard | undefined {
  return manifest[url];
}

/** テスト用 */
export function clearLinkCardManifest(): void {
  manifest = {};
}
