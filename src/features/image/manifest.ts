import { CONTENT_VARIANT, type ImageEntry, type ImageManifest } from "@/features/image/optimize";

/**
 * 描画時に寸法マニフェストを引くための置き場。
 *
 * ページは「要素を返す関数」であってコンポーネントツリーではないため、
 * React の context では末端の `Image` まで届かない。props で引き回すには
 * 全ページ・全コンポーネントの引数を変えることになり、Phase 4 で
 * 「変更は `Image` の内側に閉じる」と決めた境界を破る。
 *
 * そのため、ビルド（または dev サーバ）が描画の前に 1 度だけ差し込む形にした。
 * import 時に副作用は起こらない。値が無ければ原寸をそのまま出す。
 */
let manifest: ImageManifest = {};

/** 描画の前に呼ぶ。ステージ（optimize）の出力をそのまま渡す */
export function setImageManifest(next: ImageManifest): void {
  manifest = next;
}

/**
 * マニフェストに無い URL は最適化の対象外。原寸を指したまま寸法を持たない。
 *
 * バリアントは大きさの違い（本文用・ギャラリー用）。
 * 作っていないバリアントを指した場合も undefined になり、原寸へ倒れる
 */
export function resolveImage(
  src: string,
  variant: string = CONTENT_VARIANT
): ImageEntry | undefined {
  return manifest[src]?.[variant];
}

/** テスト用。描画のテストがマニフェストを共有しないようにする */
export function clearImageManifest(): void {
  manifest = {};
}
