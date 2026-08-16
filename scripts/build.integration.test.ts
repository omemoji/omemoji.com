import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { OptimizeResult } from "@/features/image/optimize";
import { collectAllLinkCardUrls, collectLinkCardUrls } from "@/features/link-card/urls";
import { ogUrl } from "@/features/og/generate";
import { buildRoutes } from "@/routes";
import {
  build,
  imageAssets,
  imageCacheDir,
  loadContent,
  markdownBodies,
  outputPath,
} from "./build";

/**
 * 実データ（content/）を読み、実際に書き出す統合テスト。
 *
 * 単体テスト（`*.test.ts`）はフィクスチャと合成データだけで完結する。
 * こちらはリポジトリのコンテンツと sharp の変換に依存するため、
 * 走らせる場面を選べるようファイルを分けている（`bun run test:integration`）
 */
const production = loadContent({ includeDrafts: false });
const dev = loadContent({ includeDrafts: true });

describe("下書きの扱い", () => {
  // ルートに現れるかどうかは buildRoutes が記事を 1:1 で写すことの帰結であり、
  // routes.test.ts が保証している。ここでは絞り込みそのものだけを見る
  test(`本番は下書きを除外する（${dev.articles.length} 件中 ${production.articles.length} 件）`, () => {
    expect(production.articles.every((article) => article.published)).toBe(true);
    expect(production.articles.length).toBeLessThan(dev.articles.length);
  });

  test("dev は下書きを残す", () => {
    const drafts = dev.articles.filter((article) => !article.published);

    expect(drafts.length).toBeGreaterThan(0);
    expect(dev.articles.length).toBe(production.articles.length + drafts.length);
  });
});

describe("出力先の対応", () => {
  // 対応表そのもの（実データを読まない）は build.test.ts にある
  test("全てのルートが一意な出力先を持つ", () => {
    const files = buildRoutes(production).map((route) => outputPath(route.path));

    expect(new Set(files).size).toBe(files.length);
  });
});

describe("リンクカードの収集元", () => {
  // Markdown を描画するページは記事と About の 2 つ。片方を忘れると、
  // そのページのリンクだけが素のリンクのままになる（実際に About が漏れていた）
  test("記事と About の両方から集める", () => {
    const bodies = markdownBodies(production);

    expect(bodies).toContain(production.about);
    expect(bodies.length).toBe(production.articles.length + 1);
  });

  test("About のリンクも収集される", () => {
    const urls = collectAllLinkCardUrls(markdownBodies(production));

    expect(collectLinkCardUrls(production.about).length).toBeGreaterThan(0);
    expect(urls).toEqual(expect.arrayContaining(collectLinkCardUrls(production.about)));
  });
});

/**
 * 求められた大きさを覚えていない状態からのビルド。
 *
 * どの大きさを作るかは描画中にしか分からないため、記録（requests.json）が無い初回は
 * 「描く → 作る → 描き直す」の 2 度描きになる。**2 度目に記録が残ることを見る**。
 * 変換そのものは手元・CI と共有しているキャッシュ（index.json）に当たるので焼き直しはしない
 */
describe("記録の無い初回のビルド", () => {
  let dir = "";
  const target = () => path.join(dir, "out");
  const cacheDir = () => path.join(dir, "images");

  beforeAll(
    async () => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-cold-"));
      // 変換結果だけを引き継ぎ、記録は落とす。実際のキャッシュには一切書かない
      fs.cpSync(imageCacheDir, cacheDir(), { recursive: true });
      fs.rmSync(path.join(cacheDir(), "requests.json"), { force: true });
    },
    // キャッシュが冷えていると全件を焼き直すことになる
    180_000
  );

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("2 度描いて、求められた大きさを覚える", async () => {
    const { written, skipped, images } = await build(target(), {
      offline: true,
      cacheDir: cacheDir(),
    });

    expect(skipped).toEqual([]);
    expect(written.length).toBe(buildRoutes(production).length);
    // 記録が残るので、次のビルドは 1 度描くだけで済む
    expect(fs.existsSync(path.join(cacheDir(), "requests.json"))).toBe(true);
    // 描画が求めた大きさが 2 度目までに作られている。切り抜きが要るのはギャラリー
    expect(images.converted + images.cached).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(target(), "artworks.html"), "utf-8")).toContain(
      ".240x240.avif"
    );
  }, 180_000);
});

/** ここから下は実際に書き出す。手元の out/ を壊さないよう一時ディレクトリへ出力する */
describe("ビルド出力", () => {
  let target = "";
  let written: string[] = [];
  let skipped: string[] = [];
  let images: OptimizeResult;

  const exists = (relative: string) => fs.existsSync(path.join(target, relative));

  beforeAll(
    async () => {
      target = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-build-"));
      // キャッシュは手元・CI と共有する。変換をやり直さずに済む。
      // offline はテストをネットワークから切るため。リンクカードは取得済みの分だけ出る
      ({ written, skipped, images } = await build(target, { offline: true }));
    },
    // 画像のキャッシュが冷えていると変換に 10 秒以上かかる。既定の 5 秒では足りない。
    // しかもフックが時間切れになっても変換は走り続け、後続のテストから CPU を奪う
    120_000
  );

  afterAll(() => {
    fs.rmSync(target, { recursive: true, force: true });
  });

  test("全てのルートが出力される", () => {
    const missing = buildRoutes(production)
      .map((route) => outputPath(route.path))
      .filter((file) => !exists(file));

    expect(missing).toEqual([]);
    // スキップされるページが無くなったこと自体を検査する
    expect(skipped).toEqual([]);
    expect(written.length).toBe(buildRoutes(production).length);
  });

  test.each(["index.html", "404.html", "articles.html", "artworks.html"])(
    "%s が出力される",
    (file) => {
      expect(exists(file)).toBe(true);
    }
  );

  test("下書きの記事は出力されない", () => {
    const drafts = dev.articles
      .filter((article) => !article.published)
      .map((article) => `articles/${article.slug}.html`)
      .filter((file) => exists(file));

    expect(drafts).toEqual([]);
  });

  test("コンテンツの画像が記事・作品ごとに分かれて出力される", () => {
    const images = imageAssets(production);
    const missing = images.map(({ to }) => to).filter((file) => !exists(file));

    expect(missing).toEqual([]);
    // 平置きなら同名で潰れる。名前空間が効いていることを出力先の一意性で見る
    expect(new Set(images.map(({ to }) => to)).size).toBe(images.length);
  });

  test("使われた画像だけを変換する", () => {
    // 参照されている画像が全て解決することは「ルート絶対な参照」の検査が見ている。
    // ここでは逆側、**使われていない画像を変換していないこと**を見る
    const drafts = dev.articles.filter((article) => !article.published).map((a) => a.slug);
    const unused = imageAssets(dev)
      .filter(({ url }) => drafts.some((slug) => url.startsWith(`/images/articles/${slug}/`)))
      // 本文に置かれていない画像（記事ディレクトリの取り残し）も同じ扱いになる
      .concat({
        from: "",
        to: "images/articles/minecraft_linux/base01.png",
        url: "/images/articles/minecraft_linux/base01.png",
      });

    expect(unused.length).toBeGreaterThan(1);
    expect(
      unused.map(({ to }) => to.replace(/\.[^.]+$/, ".avif")).filter((file) => exists(file))
    ).toEqual([]);

    // 変換した枚数は、描画が求めた大きさの数と釣り合う
    expect(images.converted + images.cached).toBeGreaterThan(production.articles.length);
  });

  test("ギャラリーの画像は切り抜き済みの小さいものを指す", () => {
    const html = fs.readFileSync(path.join(target, "artworks.html"), "utf-8");
    const sources = [...html.matchAll(/<source srcset="(\/images\/artworks\/[^"]+)"/gi)].map(
      (matched) => matched[1] ?? ""
    );

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src.endsWith(".240x240.avif"))).toBe(true);

    // 本文用を並べて CSS で切り抜くだけでは転送量が減らない。実体が小さいことを見る
    const thumb = sources[0] ?? "";
    const size = (file: string) => fs.statSync(path.join(target, file.slice(1))).size;

    expect(size(thumb)).toBeLessThan(size(thumb.replace(".240x240.avif", ".avif")));
  });

  test("全ての img が属性で寸法を持つ", () => {
    const htmlFiles = fs
      .readdirSync(target, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".html"));

    // 論理プロパティ（inline-size）を読まない UA では属性が唯一の寸法になり、
    // 無いと実体の寸法で表示される。chawan のギャラリーに 3000px の原寸が出ていた
    const missing = htmlFiles.flatMap((file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      return [...html.matchAll(/<img[^>]*>/g)]
        .map((matched) => matched[0])
        .filter((img) => !/width="\d+"/.test(img) || !/height="\d+"/.test(img))
        .map((img) => ({ file, img }));
    });

    expect(missing).toEqual([]);
  });

  test.each(["index.html", "articles/void_linux.html", "artworks.html"])(
    "%s に Google Analytics が入る",
    (file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");

      expect(html).toContain("G-XXCZ8KW3CC");
      expect(html).toContain("googletagmanager.com/gtag/js");
      expect(html).toContain("2500");
    }
  );

  test("記事の末尾は一覧へ戻る導線にする", () => {
    const html = fs.readFileSync(path.join(target, "articles/void_linux.html"), "utf-8");

    // 現行サイトと同じ。前後の記事へのリンクは置かない
    expect(html).toContain('<a class="back-link" href="/articles"');
    expect(html).not.toContain("article-nav");
  });

  describe("KaTeX", () => {
    // CSS が無いと MathML と HTML の両方が見え、式が二重になる
    const mathArticle = () =>
      production.articles.find((article) => article.body.includes("$$"))?.slug ?? "";

    test("数式のある記事だけがスタイルを読む", () => {
      const withMath = fs.readFileSync(
        path.join(target, `articles/${mathArticle()}.html`),
        "utf-8"
      );
      const withoutMath = fs.readFileSync(path.join(target, "articles/void_linux.html"), "utf-8");

      expect(mathArticle()).not.toBe("");
      expect(withMath).toContain('href="/katex/katex.min.css"');
      expect(withoutMath).not.toContain("katex");
    });

    test("CSS が参照するフォントが全て存在する", () => {
      const css = fs.readFileSync(path.join(target, "katex/katex.min.css"), "utf-8");
      const fonts = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((matched) => matched[1] ?? "");

      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.filter((font) => !exists(path.join("katex", font)))).toEqual([]);
    });

    test("woff と ttf は複製しない", () => {
      // 対応していないブラウザは実質無い。1.2 MB が 296 KB になる
      const files = fs.readdirSync(path.join(target, "katex/fonts"));

      expect(files.every((file) => file.endsWith(".woff2"))).toBe(true);
    });
  });

  describe("サイトマップ", () => {
    const locs = (): string[] => {
      const xml = fs.readFileSync(path.join(target, "sitemap.xml"), "utf-8");
      return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((matched) => matched[1] ?? "");
    };

    test("indexable なルートだけを載せる", () => {
      const expected = buildRoutes(production)
        .filter((route) => route.indexable)
        .map((route) => `https://omemoji.com${encodeURI(route.path)}`);

      expect(locs()).toEqual(expected);
    });

    test.each([
      ["ページネーションの 2 ページ目以降", "/articles/2"],
      ["タグ別の一覧", "/artworks/tag/"],
      ["404", "/404"],
    ])("%s を含まない", (_, fragment) => {
      expect(locs().filter((loc) => loc.includes(fragment))).toEqual([]);
    });

    test.each([["/"], ["/articles"], ["/artworks"]])("%s を含む", (routePath) => {
      expect(locs()).toContain(`https://omemoji.com${routePath}`);
    });

    test("全ての URL が出力されたページに対応する", () => {
      const missing = locs()
        .map((loc) => outputPath(decodeURI(loc).replace("https://omemoji.com", "")))
        .filter((file) => !exists(file));

      expect(missing).toEqual([]);
    });

    test("詳細ページは更新日を持つ", () => {
      const xml = fs.readFileSync(path.join(target, "sitemap.xml"), "utf-8");
      const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1] ?? "");

      // 記事と作品の数だけ付く。一覧には付けない
      expect(lastmods.length).toBe(production.articles.length + production.artworks.length);
      expect(lastmods.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))).toBe(true);
    });
  });

  describe("OGP", () => {
    const meta = (file: string, name: string): string | undefined => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      const matched = html.match(new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`));
      return matched?.[1];
    };

    test("作品は個別の画像と大きいカードを持つ", () => {
      const artwork = production.artworks[0];
      const file = `artworks/${artwork?.id}.html`;

      expect(meta(file, "og:image")).toBe(
        `https://omemoji.com${ogUrl(`/artworks/${artwork?.id}`)}`
      );
      expect(meta(file, "og:image:width")).toBe("1200");
      expect(meta(file, "twitter:card")).toBe("summary_large_image");
      expect(meta(file, "og:type")).toBe("article");
    });

    test("全ての作品ページの OGP 画像が実ファイルに解決する", () => {
      const missing = production.artworks
        .map((artwork) => ogUrl(`/artworks/${artwork.id}`))
        .filter((url) => !exists(decodeURIComponent(url).slice(1)));

      expect(missing).toEqual([]);
    });

    test.each(["index.html", "articles/void_linux.html", "artworks.html"])(
      "%s は共通の画像と通常のカードを使う",
      (file) => {
        // 記事に個別の画像は作らない。トップと同じ扱いにするという判断
        expect(meta(file, "og:image")).toBe("https://omemoji.com/omemoji.png");
        expect(meta(file, "og:image:width")).toBe("720");
        expect(meta(file, "twitter:card")).toBe("summary");
        expect(meta(file, "og:type")).toBe("website");
      }
    );
  });

  test("本文の画像は AVIF を source に出し、寸法を付ける", () => {
    const html = fs.readFileSync(path.join(target, "articles/void_linux.html"), "utf-8");

    expect(html).toMatch(/<source srcset="[^"]+\.avif" type="image\/avif"\/?>/i);
    // レイアウトのずれ（CLS）を防ぐのが目的。マニフェストが描画まで届いていることの確認でもある。
    // 縦横比は属性から UA が導くので、style で重ねる必要は無い
    expect(html).toMatch(/<img[^>]+width="\d+"[^>]+height="\d+"/);
    expect(html).not.toContain("aspect-ratio:");
  });

  test("AVIF が出る画像には必ず原寸のフォールバックが付く", () => {
    const htmlFiles = fs
      .readdirSync(target, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".html"));

    // source だけで img が無い picture は、非対応の環境で空白になる
    const orphans = htmlFiles.filter((file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      return [...html.matchAll(/<picture>(.*?)<\/picture>/gs)].some(
        (matched) => !matched[1]?.includes("<img")
      );
    });

    expect(orphans).toEqual([]);
  });

  test("HTML 内のルート絶対な参照が全て実ファイルに解決する", () => {
    const htmlFiles = fs
      .readdirSync(target, { recursive: true, encoding: "utf-8" })
      .filter((file) => file.endsWith(".html"));

    const broken = htmlFiles.flatMap((file) => {
      const html = fs.readFileSync(path.join(target, file), "utf-8");
      return (
        // srcset も見る。picture の source が壊れていても img で表示されてしまい気付けない。
        // React が source の属性を srcSet と大文字混じりで書き出すため i を付ける
        [...html.matchAll(/(?:src|href|srcset)="(\/[^"]+)"/gi)]
          .map((matched) => decodeURIComponent(matched[1] ?? ""))
          // 拡張子を持つものだけを対象にする。ページへのリンクは別の検査
          .filter((href) => path.extname(href) !== "" && !exists(href.slice(1)))
          .map((href) => ({ file, href }))
      );
    });

    expect(broken).toEqual([]);
  });

  test.each(["globals.css", "favicon.ico", "robots.txt", "omemoji.png"])(
    "%s がコピーされる",
    (file) => {
      expect(exists(file)).toBe(true);
    }
  );
});
