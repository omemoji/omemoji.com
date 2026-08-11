import Back from "@/components/Back";
import GalleryRow, { galleryRowScript } from "@/components/GalleryRow";
import Image from "@/components/Image";
import { imageUrl } from "@/features/image/assets";
import Layout from "@/layouts/Layout";
import type { PageProps } from "@/routes";

export default function ArtworkPage({ artwork, artworks }: PageProps["ArtworkPage"]) {
  const path = `/artworks/${artwork.id}`;
  const src = imageUrl("artworks", artwork.id, artwork.src);

  return (
    <Layout
      title={`${artwork.title} | 創作物紹介`}
      description={artwork.description ?? ""}
      category="Artworks"
      path={path}
    >
      {/* 原寸を直接開けるようにする。旧実装と同じ導線 */}
      <a href={src}>
        {/* 主役の画像なので遅延させない（旧実装の priority に相当） */}
        <Image src={src} alt={artwork.title} loading="eager" />
      </a>

      <div className="artwork-detail">
        <h1>{artwork.title}</h1>
        <div className="artwork-detail-tags">
          {artwork.tags.map((tag) => (
            <a key={tag} className="tag" href={encodeURI(`/artworks/tag/${tag}`)}>
              {`#${tag}`}
            </a>
          ))}
        </div>
        {artwork.description ? <p>{artwork.description}</p> : null}
      </div>

      <GalleryRow artworks={artworks} current={artwork.id} />
      <Back
        href="/artworks"
        path={path}
        title={`${artwork.title} | 創作物紹介`}
        tags={artwork.tags}
      />

      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: ビルド時に確定する定数 */}
      <script dangerouslySetInnerHTML={{ __html: galleryRowScript }} />
    </Layout>
  );
}
