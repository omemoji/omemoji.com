import { afterEach, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import Image, { Picture } from "@/components/Image";
import { clearImageManifest, setImageManifest, takeImageWants } from "@/features/image/manifest";

const render = (element: React.ReactNode) => renderToStaticMarkup(element);

afterEach(() => {
  clearImageManifest();
});

test("AVIF を source に出し、img は原寸へ倒す", () => {
  setImageManifest({
    "/images/articles/x/a.png": {
      default: { src: "/images/articles/x/a.avif", width: 700, height: 350 },
    },
  });

  const html = render(<Image src="/images/articles/x/a.png" alt="図" />);

  expect(html).toContain('<source srcSet="/images/articles/x/a.avif" type="image/avif"/>');
  // AVIF を解釈できない環境がここへ倒れる。src が .avif だと代替が無く空白になる
  expect(html).toContain('src="/images/articles/x/a.png"');
});

test("寸法は img に付ける。縦横比は原寸と変わらないので倒れても同じ値でよい", () => {
  setImageManifest({
    "/images/articles/x/a.png": {
      default: { src: "/images/articles/x/a.avif", width: 700, height: 350 },
    },
  });

  const html = render(<Image src="/images/articles/x/a.png" alt="図" />);

  expect(html).toContain('width="700"');
  expect(html).toContain('height="350"');
  // 縦横比は属性から UA が導く。style で重ねると、切り抜きを求めたときに
  // 実際の形と食い違うものが宣言されてしまう
  expect(html).not.toContain("aspect-ratio");
  expect(html).not.toContain("style=");
});

test("切り抜きを求めると、その箱の寸法がそのまま属性になる", () => {
  setImageManifest({
    "/images/artworks/y/a.png": {
      // 既定バリアントもある状態。こちらの縦横比（3:2）に引きずられてはいけない
      default: { src: "/images/artworks/y/a.avif", width: 600, height: 400 },
      "240x240": { src: "/images/artworks/y/a.240x240.avif", width: 480, height: 480 },
    },
  });

  const html = render(<Image src="/images/artworks/y/a.png" alt="題" width={240} height={240} />);

  expect(html).toContain('srcSet="/images/artworks/y/a.240x240.avif"');
  expect(html).toContain('width="240"');
  expect(html).toContain('height="240"');
});

test("求めた大きさだけを記録する。使わない既定バリアントは作らない", () => {
  render(<Image src="/images/artworks/y/a.png" alt="題" width={240} height={240} />);

  expect(takeImageWants()).toEqual([{ src: "/images/artworks/y/a.png", width: 240, height: 240 }]);
});

test("dev のように変換していない場合は picture で包まない", () => {
  // 原寸を指すマニフェスト（measureImages の出力）。PNG を image/avif と名乗ってはいけない
  setImageManifest({
    "/images/articles/x/a.png": {
      default: { src: "/images/articles/x/a.png", width: 700, height: 350 },
    },
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
    "/images/artworks/y/a.png": {
      default: { src: "/images/artworks/y/a.avif", width: 540, height: 540 },
    },
  });

  expect(render(<Image src="/images/artworks/y/a.png" alt="題" caption />)).toContain(
    "<figcaption"
  );
  expect(render(<Image src="/images/artworks/y/a.png" alt="題" />)).not.toContain("<figcaption");
});

test("Picture は分かっている寸法を必ず属性で出す", () => {
  setImageManifest({
    "/images/artworks/y/a.png": {
      default: { src: "/images/artworks/y/a.avif", width: 540, height: 540 },
    },
  });

  // CSS を解釈しない UA では属性が唯一の寸法になる（chawan で原寸が出ていた）
  const html = render(<Picture src="/images/artworks/y/a.png" alt="題" />);

  expect(html).toContain('type="image/avif"');
  expect(html).toContain('width="540"');
  expect(html).toContain('height="540"');
});

test("求めた大きさで引き、属性は表示サイズを出す", () => {
  // 240x240 を求めると、実体は 2 倍で作られる。属性は求めた側の値のまま
  setImageManifest({
    "/images/artworks/y/a.png": {
      "240x240": { src: "/images/artworks/y/a.240x240.avif", width: 480, height: 480 },
    },
  });

  const html = render(<Picture src="/images/artworks/y/a.png" alt="題" width={240} height={240} />);

  expect(html).toContain('srcSet="/images/artworks/y/a.240x240.avif"');
  expect(html).toContain('width="240"');
  expect(html).not.toContain('width="480"');
});

test("求めた大きさが無ければ記録され、原寸へ倒れる", () => {
  const html = render(<Picture src="/images/artworks/y/a.png" alt="題" width={240} height={240} />);

  expect(html).not.toContain("<picture>");
  expect(takeImageWants()).toEqual([{ src: "/images/artworks/y/a.png", width: 240, height: 240 }]);
});

test("呼び出し側の指定が最適化の結果より優先される", () => {
  setImageManifest({
    "/images/artworks/y/a.png": {
      default: { src: "/images/artworks/y/a.avif", width: 540, height: 540 },
    },
  });

  // 作品ページの主役画像は遅延させない（旧実装の priority に相当）
  expect(render(<Image src="/images/artworks/y/a.png" alt="題" loading="eager" />)).toContain(
    'loading="eager"'
  );
});
