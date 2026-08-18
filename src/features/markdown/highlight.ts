import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import type { Root } from "hast";
import {
  createRenderer,
  type RehypeExpressiveCodeOptions,
  type RehypeExpressiveCodeRenderer,
} from "rehype-expressive-code";
import { hasClass } from "@/features/markdown/has-class";

export const expressiveCodeOptions: RehypeExpressiveCodeOptions = {
  themes: ["github-dark", "github-light"],
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
  defaultProps: {
    showLineNumbers: false,
    collapse: "30-9999",
  },
  styleOverrides: {
    borderColor: "var(--border)",
    frames: {
      frameBoxShadowCssValue: "none",
    },
  },
};

declare global {
  var __expressiveCode: Promise<RehypeExpressiveCodeRenderer> | undefined;
}

/**
 * expressive-code のレンダラを 1 度だけ構築する。
 *
 * Shiki の初期化は重いので、`bun --hot` でモジュールが差し替わっても
 * インスタンスが残るよう globalThis に退避する。
 */
export function getRenderer(): Promise<RehypeExpressiveCodeRenderer> {
  globalThis.__expressiveCode ??= createRenderer(expressiveCodeOptions);
  return globalThis.__expressiveCode;
}

/**
 * rehype に渡すレンダラ。**CSS と JS を空にして渡す。**
 *
 * rehype-expressive-code は baseStyles / themeStyles / jsModules を
 * 「コードブロックを含む文書ごと」にインラインで差し込む（差し込み済みを覚える
 * Set が文書単位で作られるため）。記事 1 ページあたり CSS 24 KB・JS 2.5 KB が
 * 重複し、内容は全ページ同一なのにブラウザキャッシュも効かない。
 *
 * 空を渡せば差し込みが止まる。同じ中身は out/code.css・out/code.js として
 * 1 度だけ書き出し、必要なページだけが読む（astro-expressive-code が既定で
 * 行っている hoisting を自前でやる形）。
 *
 * ブロック単位でプラグインが足す style（`ec.render` が返す分）はそのまま
 * インラインで残す。現在の構成では 0 バイトであり、将来出るようになっても
 * そのブロックのあるページにしか出ないため。
 */
export async function getRendererWithoutAssets(): Promise<RehypeExpressiveCodeRenderer> {
  const { ec } = await getRenderer();
  return { ec, baseStyles: "", themeStyles: "", jsModules: [] };
}

/** コードブロックの CSS。out/code.css の中身になる */
export async function codeStyles(): Promise<string> {
  const { baseStyles, themeStyles } = await getRenderer();
  return baseStyles + themeStyles;
}

/**
 * コードブロックのクライアント側スクリプト（行折り返しの切り替えなど）。
 * out/code.js の中身になる。
 *
 * expressive-code は複数のモジュールを返すが、いずれも `try{(()=>{ ... })()}catch{}`
 * の形で閉じているため、束ねても名前が衝突しない。
 * **中身を組み立てるのはここだけにする**（ビルドと dev で違うものが出ないように）
 */
export async function codeScript(): Promise<string> {
  return (await getRenderer()).jsModules.join("\n");
}

/**
 * expressive-code の出力が木に含まれるか。
 *
 * CSS と JS を全ページ共通のファイルへ追い出した結果、読み込みの判断がページ側に
 * 移った。コードブロックの無いページに読ませない（数式と同じ扱い）
 */
export function hasCode(tree: Root): boolean {
  return hasClass(tree, "expressive-code");
}
