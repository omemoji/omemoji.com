import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import * as z from "zod";

import { sortByDate } from "@/collections/query";
import { TAGS } from "@/collections/tags";

/** 先頭の frontmatter ブロック。行頭にアンカーしないと本文中の水平線を拾う */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export const articleSchema = z.object({
  emoji: z.string(),
  title: z.string(),
  description: z.string(),
  // yaml は既定で日付を解釈せず文字列を返すため、書式を検証してから Date にする
  date: z.iso.date().transform((value) => new Date(value)),
  tags: z.array(z.enum(TAGS)),
  published: z.boolean(),
});

export type Article = {
  /** 記事ディレクトリ名から導出する。frontmatter には持たせない */
  slug: string;
  /** baseDir からの相対パス。本文中の相対参照はこのディレクトリを基準に解決する */
  file: string;
  /** frontmatter を除いた本文 */
  body: string;
} & z.infer<typeof articleSchema>;

/**
 * `<baseDir>/<年>/<月>/<slug>/<任意>.md` を走査して読み込む。
 */
export function loadArticles(baseDir: string): Article[] {
  const articles = fs
    .readdirSync(baseDir, { recursive: true, encoding: "utf-8" })
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");
      const matched = raw.match(FRONTMATTER);
      if (!matched?.[1]) {
        throw new Error(`Frontmatter not found in ${file}`);
      }
      const meta = articleSchema.safeParse(parseYaml(matched[1]));
      if (!meta.success) {
        throw new Error(`Invalid frontmatter in ${file}: ${z.prettifyError(meta.error)}`);
      }
      return {
        slug: path.basename(path.dirname(file)),
        file,
        body: raw.slice(matched[0].length),
        ...meta.data,
      };
    });

  return sortByDate(articles); // 日付の降順でソート
}
