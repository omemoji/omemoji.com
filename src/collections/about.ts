import fs from "node:fs";
import path from "node:path";

/**
 * About ページの本文を読む。
 * 記事と違い 1 件しかなく frontmatter も持たないため、スキーマは設けない。
 */
export function loadAbout(baseDir: string): string {
  return fs.readFileSync(path.join(baseDir, "about.md"), "utf-8");
}
