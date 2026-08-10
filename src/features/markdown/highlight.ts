import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import {
  createRenderer,
  type RehypeExpressiveCodeOptions,
  type RehypeExpressiveCodeRenderer,
} from "rehype-expressive-code";

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
 * コードブロックの CSS。
 *
 * astro-expressive-code と違い rehype-expressive-code は CSS を自動で差し込まないため、
 * 呼び出し側が <head> へ手動で注入する。
 */
export async function codeStyles(): Promise<string> {
  const { baseStyles, themeStyles } = await getRenderer();
  return baseStyles + themeStyles;
}

/** コードブロックが必要とするクライアント側のスクリプト（行折り返しの切り替えなど） */
export async function codeScripts(): Promise<string[]> {
  return (await getRenderer()).jsModules;
}
