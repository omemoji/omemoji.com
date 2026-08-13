import {
  type ImageEntry,
  type ImageManifest,
  type ImageRequest,
  type ImageWant,
  requestKey,
} from "@/features/image/optimize";

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

/**
 * まだ無かった要求。**どの大きさを作るかはここに溜まる。**
 *
 * 呼び出し側が事前に列挙するのではなく、描画が求めたものを記録して後から作る。
 * これにより、必要な大きさを知っているコンポーネントだけが寸法を持てばよくなる
 */
const wanted = new Map<string, ImageWant>();

/** 描画の前に呼ぶ。ステージ（optimize）の出力をそのまま渡す */
export function setImageManifest(next: ImageManifest): void {
  manifest = next;
}

/**
 * 求めた大きさの画像を引く。無ければ記録して `undefined` を返す。
 *
 * 呼び出し側は原寸へ倒し、記録された分はビルド（または dev）が後から作る
 */
export function resolveImage(src: string, request: ImageRequest = {}): ImageEntry | undefined {
  const key = requestKey(request);
  const entry = manifest[src]?.[key];

  if (!entry) {
    wanted.set(`${src}|${key}`, { src, ...request });
  }
  return entry;
}

/** 描画中に求められて、まだ無かったものを回収する。取り出すと空になる */
export function takeImageWants(): ImageWant[] {
  const wants = [...wanted.values()];
  wanted.clear();
  return wants;
}

/** テスト用。描画のテストがマニフェストを共有しないようにする */
export function clearImageManifest(): void {
  manifest = {};
  wanted.clear();
}
