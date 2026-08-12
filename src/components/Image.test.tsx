import { afterEach, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Image, { Picture } from "@/components/Image";
import { clearImageManifest, setImageManifest } from "@/features/image/manifest";

const render = (element: React.ReactNode) => renderToStaticMarkup(element);

afterEach(() => {
  clearImageManifest();
});

test("AVIF を source に出し、img は原寸へ倒す", () => {
  setImageManifest({
    "/images/articles/x/a.png": { src: "/images/articles/x/a.avif", width: 700, height: 350 },
  });

  const html = render(<Image src="/images/articles/x/a.png" alt="図" />);

  expect(html).toContain('<source srcSet="/images/articles/x/a.avif" type="image/avif"/>');
  // AVIF を解釈できない環境がここへ倒れる。src が .avif だと代替が無く空白になる
  expect(html).toContain('src="/images/articles/x/a.png"');
});

test("寸法は img に付ける。縦横比は原寸と変わらないので倒れても同じ値でよい", () => {
  setImageManifest({
    "/images/articles/x/a.png": { src: "/images/articles/x/a.avif", width: 700, height: 350 },
  });

  const html = render(<Image src="/images/articles/x/a.png" alt="図" />);

  expect(html).toContain('width="700"');
  expect(html).toContain('height="350"');
  // width / height だけでは CSS の inline-size: 100% に負けるため aspect-ratio も要る
  expect(html).toContain("aspect-ratio:700 / 350");
});

test("dev のように変換していない場合は picture で包まない", () => {
  // 原寸を指すマニフェスト（measureImages の出力）。PNG を image/avif と名乗ってはいけない
  setImageManifest({
    "/images/articles/x/a.png": { src: "/images/articles/x/a.png", width: 700, height: 350 },
  });

  const html = render(<Image src="/images/articles/x/a.png" alt="図" />);

  expect(html).not.toContain("<picture>");
  // 寸法は dev でも出す。本番と同じ場所が確保される
  expect(html).toContain('width="700"');
});

test("マニフェストに無い画像は picture で包まず、寸法も付けない", () => {
  const html = render(<Image src="/images/articles/x/a.svg" alt="図" />);

  expect(html).toContain('src="/images/articles/x/a.svg"');
  expect(html).not.toContain("<picture>");
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

test("ギャラリーは Picture を直に使う。寸法は CSS が決めるので付けない", () => {
  setImageManifest({
    "/images/artworks/y/a.png": { src: "/images/artworks/y/a.avif", width: 540, height: 540 },
  });

  const html = render(<Picture src="/images/artworks/y/a.png" alt="題" />);

  expect(html).toContain('type="image/avif"');
  expect(html).not.toContain("width=");
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
