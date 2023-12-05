import type { Metadata } from "next";
import { HOST } from "lib/constant";
import Header from "components/Header";
import Footer from "components/Footer";
import "../styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${HOST}`),
  creator: "omemoji",
  publisher: "omemoji",
  authors: [{ name: "omemoji", url: `https://${HOST}` }],
  generator: "Next.js",
  applicationName: "omemoji",
  openGraph: {
    siteName: "創作物紹介",
    locale: "ja_JP",
  },
  title: "創作物紹介",
  description: "omemoji's portfolio",
  keywords: ["創作物紹介", "omemoji"],

  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/images/Metadata/apple-touch-icon.png" },
  ],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
