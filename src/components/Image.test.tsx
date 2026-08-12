import { afterEach, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Image from "@/components/Image";
import { clearImageManifest, setImageManifest } from "@/features/image/manifest";

const render = (element: React.ReactNode) => renderToStaticMarkup(element);

afterEach(() => {
  clearImageManifest();
});

test("マニフェストにある画像は AVIF へ差し替わり、寸法が付く", () => {
  setImageManifest({
    "/images/articles/x/a.png": { src: "/images/articles/x/a.avif", width: 700, height: 350 },
  });

  const html = render(<Image src="/images/articles/x/a.png" alt="図" />);

  expect(html).toContain('src="/images/articles/x/a.avif"');
  expect(html).toContain('width="700"');
  expect(html).toContain('height="350"');
  // width / height だけでは CSS の inline-size: 100% に負けるため aspect-ratio も要る
  expect(html).toContain("aspect-ratio:700 / 350");
});

test("マニフェストに無い画像は原寸のまま、寸法を付けない", () => {
  const html = render(<Image src="/images/articles/x/a.svg" alt="図" />);

  expect(html).toContain('src="/images/articles/x/a.svg"');
  expect(html).not.toContain("width=");
  expect(html).not.toContain("aspect-ratio");
});

test("キャプションは alt から出す。作品画像は出さない", () => {
  setImageManifest({
    "/images/artworks/y/a.png": { src: "/images/artworks/y/a.avif", width: 540, height: 540 },
  });

  expect(render(<Image src="/images/artworks/y/a.png" alt="題" caption />)).toContain(
    "<figcaption"
  );
  expect(render(<Image src="/images/artworks/y/a.png" alt="題" />)).not.toContain("<figcaption");
});

test("呼び出し側の指定が最適化の結果より優先される", () => {
  setImageManifest({
    "/images/artworks/y/a.png": { src: "/images/artworks/y/a.avif", width: 540, height: 540 },
  });

  // 作品ページの主役画像は遅延させない（旧実装の priority に相当）
  expect(render(<Image src="/images/artworks/y/a.png" alt="題" loading="eager" />)).toContain(
    'loading="eager"'
  );
});
