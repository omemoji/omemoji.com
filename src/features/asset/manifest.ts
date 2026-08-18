/** 論理名（`globals.css`）→ 実際に配信する URL（`/globals.<指紋>.css`） */
export type AssetManifest = Record<string, string>;

/**
 * 指紋付きの URL を引くための置き場。
 *
 * 画像の寸法マニフェスト（features/image/manifest.ts）と同じ形にしてある。
 * ページはコンポーネントツリーではなく「要素を返す関数」であるため React の
 * context が届かず、ビルド（または dev サーバ）が描画の前に差し込む。
 * import 時に副作用は起こらない。
 */
let manifest: AssetManifest = {};

/** 描画の前に呼ぶ。ステージ（writeAssets）の出力をそのまま渡す */
export function setAssetManifest(next: AssetManifest): void {
  manifest = next;
}

/**
 * 論理名から配信 URL を引く。
 *
 * **値が無ければ論理名をそのまま返す。** dev サーバは指紋を付けず原本を返すため、
 * マニフェストを差し込まないことが「指紋なし」の指定になる
 */
export function assetUrl(name: string): string {
  return manifest[name] ?? `/${name}`;
}

/** テスト用。描画のテストがマニフェストを共有しないようにする */
export function clearAssetManifest(): void {
  manifest = {};
}
