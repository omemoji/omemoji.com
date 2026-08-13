import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header, { type Category } from "@/components/Header";
import { HOST } from "@/config";
import { resolveOg } from "@/features/og/manifest";

type Props = {
  title: string;
  description: string;
  /** ヘッダのどのメニューを現在地として示すか。省くとどれも示さない */
  category?: Category;
  /** 先頭が `/` のルートパス。og:url の組み立てに使う */
  path: string;
  children: ReactNode;
};

/**
 * 個別の OGP 画像を持たないページが使う共通の画像。
 *
 * 記事も含めてほとんどのページがこちら。正方形なので大きいカードには向かず、
 * Twitter Card は summary（小さいカード）にする
 */
const DEFAULT_OG = { src: "/omemoji.png", width: 720, height: 720 };

/**
 * 全ページ共通の外枠。`<head>` の組み立てをここに集約する。
 *
 * expressive-code の CSS と JS は hast の中に既に入っているため、
 * ここで読み込むと二重になる（features/markdown/pipeline.ts の注記）。
 */
export default function Layout({ title, description, category, path, children }: Props) {
  const site = `https://${HOST}`;
  const url = `${site}${path}`;

  // 個別の OGP 画像はビルドが用意する（features/og）。ページ側は何も渡さない。
  // dev は生成しないため常に共通の画像になる
  const og = resolveOg(path);
  const image = og ?? DEFAULT_OG;

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <link rel="stylesheet" href="/globals.css" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <meta name="author" content="omemoji" />
        <meta name="creator" content="omemoji" />
        <meta name="publisher" content="omemoji" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="創作物紹介" />
        {/* og:image は絶対 URL でなければクローラが解決できない */}
        <meta property="og:image" content={`${site}${image.src}`} />
        <meta property="og:image:width" content={String(image.width)} />
        <meta property="og:image:height" content={String(image.height)} />
        <meta property="og:type" content={og ? "article" : "website"} />
        <meta name="twitter:card" content={og ? "summary_large_image" : "summary"} />
        <meta name="twitter:site" content="@omemoji_art" />
        <meta name="twitter:creator" content="@omemoji_art" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </head>
      <body>
        <Header category={category} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
