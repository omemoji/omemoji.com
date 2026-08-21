import type { ReactNode } from "react";
import Analytics from "@/components/Analytics";
import Footer from "@/components/Footer";
import Header, { type Category } from "@/components/Header";
import { CODE_ASSETS, HOST, KATEX_CSS, STYLESHEET } from "@/config";
import { assetUrl } from "@/features/asset/manifest";
import { resolveOg } from "@/features/og/manifest";

type Props = {
  title: string;
  description: string;
  /** ヘッダのどのメニューを現在地として示すか。省くとどれも示さない */
  category?: Category;
  /** 先頭が `/` のルートパス。og:url の組み立てに使う */
  path: string;
  /** 数式を含むページだけ KaTeX のスタイルを読む。無いと式が二重に見える */
  math?: boolean;
  /** コードブロックを含むページだけ expressive-code の CSS と JS を読む */
  code?: boolean;
  children: ReactNode;
};

/**
 * 個別の OGP 画像を持たないページが使う共通の画像。
 *
 * 一覧やトップはこちら。正方形なので大きいカードには向かず、
 * Twitter Card は summary（小さいカード）にする
 */
const DEFAULT_OG = { src: "/omemoji.png", width: 720, height: 720 };

/**
 * 全ページ共通の外枠。`<head>` の組み立てをここに集約する。
 *
 * expressive-code の CSS と JS は本文の hast から抜いてあり、ここから
 * 共通ファイルとして読む（features/markdown/highlight.ts の注記）。
 */
export default function Layout({
  title,
  description,
  category,
  path,
  math = false,
  code = false,
  children,
}: Props) {
  const site = `https://${HOST}`;
  const url = `${site}${path}`;

  // 個別の OGP 画像はビルドが用意する（features/og）。ページ側は何も渡さない。
  // dev は生成しないため常に共通の画像になる
  const og = resolveOg(path);

  // Twitter Card は個別の画像があればそれを大きく出す。
  const twitterImage = og ?? DEFAULT_OG;

  // **記事の画像は Twitter Card 専用。**og:image は共通の画像に倒す。
  // 通常のリンクカード（og:image を読む側）には記事もサイトの顔を出すという判断
  const image = og?.kind === "artwork" ? og : DEFAULT_OG;

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        {/* URL は assetUrl 経由で引く。ビルドは指紋付き、dev は素の名前を返す */}
        <link rel="stylesheet" href={assetUrl(STYLESHEET)} />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        {math && <link rel="stylesheet" href={assetUrl(KATEX_CSS)} />}
        {code && <link rel="stylesheet" href={assetUrl(CODE_ASSETS.css)} />}
        {/* type=module は既定で defer 相当のため、head に置いても描画を止めない */}
        {code && <script type="module" src={assetUrl(CODE_ASSETS.js)} />}
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
        {/* og:image と別物になり得るため、Twitter 用の画像は明示する */}
        <meta name="twitter:image" content={`${site}${twitterImage.src}`} />
      </head>
      <body>
        <Header category={category} />
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
