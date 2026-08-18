import { markdownComponents } from "@/components/MarkdownComponent";
import Top from "@/components/Top";
import { hasCode } from "@/features/markdown/highlight";
import { hasMath } from "@/features/markdown/math";
import { mdToHast } from "@/features/markdown/pipeline";
import { toReact } from "@/features/markdown/render";
import Layout from "@/layouts/Layout";
import type { PageProps } from "@/routes";

export default async function AboutPage({ body }: PageProps["AboutPage"]) {
  const tree = await mdToHast(body);

  return (
    <Layout
      title="創作物紹介"
      description="omemoji's portfolio"
      category="About"
      path="/"
      math={hasMath(tree)}
      code={hasCode(tree)}
    >
      <Top title="omemoji" description="omemoji's portfolio" />
      <article>{toReact(tree, markdownComponents)}</article>
    </Layout>
  );
}
