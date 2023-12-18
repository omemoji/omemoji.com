import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import MDXComponent from "components/MDXComponent";
import rehypeRaw from "rehype-raw";
import remarkUnwrapImages from "remark-unwrap-images";
import rehypePrettyCode from "rehype-pretty-code";
import { remarkLinkCard, linkCardHandler } from "lib/remark-link-card";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
const compiler = async (source: string) => {
  const result: Promise<{
    content: JSX.Element;
    frontmatter: {
      emoji: string;
      slug: string;
      title: string;
      date: string;
      description: string;
      tags: string[];
    };
  }> = compileMDX({
    source,
    components: MDXComponent,
    options: {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkGemoji,
          remarkUnwrapImages,
          remarkLinkCard,
          remarkMath,
        ],
        rehypePlugins: [
          [rehypePrettyCode, { theme: "monokai", grid: true }],
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
          rehypeKatex,
          rehypeRaw,
        ],

        remarkRehypeOptions: {
          allowDangerousHtml: true,
          handlers: {
            linkCard: linkCardHandler,
          },
          footnoteLabel: "脚注",
        },
        format: "md",
      },
      parseFrontmatter: true,
    },
  });
  return result;
};

export default compiler;
