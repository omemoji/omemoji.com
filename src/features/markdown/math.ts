import type { Root } from "hast";
import { hasClass } from "@/features/markdown/has-class";

/**
 * KaTeX の出力が木に含まれるか。
 *
 * KaTeX は専用の CSS が無いと表示が崩れる。MathML と HTML の両方を出しており、
 * 一方を隠すのが CSS の役目であるため、**読み込まないと同じ式が二重に見える**。
 * 一方で数式のあるページは一部なので、必要なページだけで読み込めるように判定する
 */
export function hasMath(tree: Root): boolean {
  return hasClass(tree, "katex");
}
