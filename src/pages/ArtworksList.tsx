import Gallery from "@/components/Gallery";
import PageBar from "@/components/PageBar";
import Top from "@/components/Top";
import Layout from "@/layouts/Layout";
import type { PageProps } from "@/routes";

const DESCRIPTION = "omemoji's artworks";

export default function ArtworksList({ items, page, pageCount, tag }: PageProps["ArtworksList"]) {
  // routes.ts の paginateRoutes と同じ規則。ここがずれるとページ送りが 404 になる
  const basePath = tag === undefined ? "/artworks" : `/artworks/tag/${tag}`;

  return (
    <Layout
      title={`${tag ? `${tag}: ` : ""}Artworks | 創作物紹介`}
      description={DESCRIPTION}
      category="Artworks"
      path={page === 1 ? basePath : `${basePath}/${page}`}
    >
      <Top title={tag ? `#${tag}` : "Artworks"} description={tag ? `Tag: ${tag}` : DESCRIPTION} />
      <Gallery artworks={items} />
      <PageBar basePath={basePath} page={page} pageCount={pageCount} />
    </Layout>
  );
}
