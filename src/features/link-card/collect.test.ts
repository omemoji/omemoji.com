import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

import { collectLinkCards } from "@/features/link-card/collect";
import type { Fetcher } from "@/features/link-card/fetch-meta";
import { collectAllLinkCardUrls, collectLinkCardUrls } from "@/features/link-card/urls";

describe("URL の収集", () => {
  test("段落に裸のリンクが 1 つだけならカードにする", () => {
    expect(collectLinkCardUrls("https://example.com/a\n\n次の段落")).toEqual([
      "https://example.com/a",
    ]);
  });

  test.each([
    ["文中のリンク", "見よ https://example.com/a と書いた"],
    ["文字列を伴うリンク", "[例](https://example.com/a)"],
    ["内部リンク", "/articles/x"],
  ])("%s はカードにしない", (_, markdown) => {
    expect(collectLinkCardUrls(markdown)).toEqual([]);
  });

  test("frontmatter の中の URL は拾わない", () => {
    const markdown = "---\nsite: https://example.com/a\n---\n\n本文";

    expect(collectLinkCardUrls(markdown)).toEqual([]);
  });

  test("複数の本文から重複を除いて集める", () => {
    const urls = collectAllLinkCardUrls(["https://example.com/a", "https://example.com/a"]);

    expect(urls).toEqual(["https://example.com/a"]);
  });
});

describe("取得のステージ", () => {
  let dir = "";
  const cacheFile = () => path.join(dir, "link-meta.json");
  const cacheDir = () => path.join(dir, "thumbs");
  const outDir = () => path.join(dir, "out");

  let thumbnail: Buffer;

  const page = (head: string) => new Response(`<html><head>${head}</head></html>`);

  /** OGP 画像を持つページ。サムネイルの取得まで進む */
  const head =
    '<meta property="og:title" content="題" /><meta property="og:description" content="説明" /><meta property="og:image" content="/a.png" />';

  /** OGP と画像を返す取得器 */
  const fetcher = (): Fetcher & { calls: string[] } => {
    const calls: string[] = [];
    const fake = async (url: string) => {
      calls.push(url);
      return url.endsWith(".png") ? new Response(thumbnail as unknown as BodyInit) : page(head);
    };
    return Object.assign(fake, { calls });
  };

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-linkcard-"));
    thumbnail = await sharp({
      create: { width: 1200, height: 630, channels: 3, background: "#888" },
    })
      .png()
      .toBuffer();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const collect = (fetch: Fetcher, offline = false) =>
    collectLinkCards(["https://example.com/entry"], {
      cacheFile: cacheFile(),
      cacheDir: cacheDir(),
      outDir: outDir(),
      offline,
      retryDelayMs: 0,
      fetch,
    });

  test("メタデータとサムネイルを出力する", async () => {
    const { manifest, fetched } = await collect(fetcher());
    const card = manifest["https://example.com/entry"];

    expect(fetched).toBe(1);
    expect(card?.title).toBe("題");
    // 高さ 120px の webp にする。相手のサイトが消えても崩れない
    expect(card?.image?.height).toBe(120);
    expect(card?.image?.src).toMatch(/^\/images\/ogp_link\/[0-9a-f]{16}\.webp$/);
    expect(fs.existsSync(path.join(outDir(), card?.image?.src.slice(1) ?? ""))).toBe(true);
  });

  test("2 回目はネットワークを触らない", async () => {
    await collect(fetcher());
    const second = fetcher();
    const { fetched, cached, manifest } = await collect(second);

    expect(second.calls).toEqual([]);
    expect(fetched).toBe(0);
    expect(cached).toBe(1);
    expect(manifest["https://example.com/entry"]?.title).toBe("題");
  });

  test("dev はキャッシュにある分だけカードにする", async () => {
    const offline = fetcher();
    const { manifest, failed } = await collect(offline, true);

    expect(offline.calls).toEqual([]);
    expect(manifest).toEqual({});
    // 取得できなかった URL は素のリンクとして描画される
    expect(failed).toEqual(["https://example.com/entry"]);
  });

  test("dev もキャッシュがあれば使う", async () => {
    await collect(fetcher());
    const offline = fetcher();
    const { manifest } = await collect(offline, true);

    expect(offline.calls).toEqual([]);
    expect(manifest["https://example.com/entry"]?.title).toBe("題");
  });

  test("取得に失敗した URL はキャッシュに残さない", async () => {
    const dead = Object.assign(async () => new Response("", { status: 500 }), { calls: [] });
    const { manifest, failed } = await collect(dead);

    expect(manifest).toEqual({});
    expect(failed).toEqual(["https://example.com/entry"]);
    // 次のビルドで取り直せるよう、失敗はキャッシュファイルに書かない
    expect(fs.existsSync(cacheFile())).toBe(false);
  });

  test("画像が取れなくても文字だけのカードになる", async () => {
    const noImage = Object.assign(
      async (url: string) =>
        url.endsWith(".png")
          ? new Response("", { status: 404 })
          : page('<meta property="og:title" content="題" />'),
      { calls: [] }
    );

    const { manifest } = await collect(noImage);

    expect(manifest["https://example.com/entry"]).toEqual({
      url: "https://example.com/entry",
      title: "題",
      description: "",
    });
  });

  test.each([
    ["OGP 画像が取れない", new Response("", { status: 404 })],
    // 画像でないもの（HTML のエラーページなど）が返ることがある
    ["OGP 画像が画像でない", new Response("<html>error</html>")],
  ])("%s場合も文字だけのカードになる", async (_, image) => {
    const failing = Object.assign(
      async (url: string) => (url.endsWith(".png") ? image : page(head)),
      {
        calls: [],
      }
    );

    const { manifest, fetched } = await collect(failing);

    expect(fetched).toBe(1);
    expect(manifest["https://example.com/entry"]?.title).toBe("題");
    expect(manifest["https://example.com/entry"]?.image).toBeUndefined();
  });

  test("サムネイルの実体が無ければ画像の参照ごと落とす", async () => {
    await collect(fetcher());
    // メタデータだけが残り、画像が失われた状態を作る
    fs.rmSync(cacheDir(), { recursive: true, force: true });

    const { manifest } = await collect(fetcher(), true);

    expect(manifest["https://example.com/entry"]?.image).toBeUndefined();
  });
});
