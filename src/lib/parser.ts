import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { matter } from "vfile-matter";

import type { ArticleMeta } from "./interface";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

/**
 * Plugin to parse YAML frontmatter and expose it at `file.data.matter`.
 *
 * @type {import('unified').Plugin<[void, VFile], void, void>}
 */
export default function remarkParseMatter(): Plugin<[void, VFile], void, void> {
  return function (_: void, file: VFile) {
    matter(file);
  };
}

declare module "vfile" {
  interface DataMap {
    matter: ArticleMeta;
  }
}

export const mdInfo = async (md: string) => {
  const result = await unified()
    .use(remarkParse)
    .use(remarkStringify)
    .use(remarkFrontmatter)
    .use(remarkParseMatter)
    .process(md);

  return result.data.matter as ArticleMeta;
};
