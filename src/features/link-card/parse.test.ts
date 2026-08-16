import { describe, expect, test } from "bun:test";

import {
  absoluteUrl,
  isSubdomain,
  parentDomainUrl,
  parseMeta,
  shortenUrl,
} from "@/features/link-card/parse";

const html = (head: string) => `<!doctype html><html><head>${head}</head><body></body></html>`;

describe("parseMeta", () => {
  test("OGP を読む", () => {
    const meta = parseMeta(
      html(`
        <meta property="og:title" content="題" />
        <meta property="og:description" content="説明" />
        <meta property="og:image" content="https://example.com/a.png" />
      `),
      "https://example.com/entry"
    );

    expect(meta).toEqual({
      title: "題",
      description: "説明",
      image: "https://example.com/a.png",
      hasOgp: true,
    });
  });

  test("OGP が無くても title があれば返す（hasOgp は false）", () => {
    // 取得側はこれを見て、bot の UA でもう一度読みに行く
    const meta = parseMeta(html("<title>題</title>"), "https://example.com/entry");

    expect(meta?.title).toBe("題");
    expect(meta?.hasOgp).toBe(false);
  });

  test("OGP も title も無ければ undefined", () => {
    expect(parseMeta(html(""), "https://example.com/entry")).toBeUndefined();
  });

  test("og:title が空なら title へ、それも無ければ URL へ落ちる", () => {
    const empty = parseMeta(
      html('<meta property="og:image" content="/a.png" /><title>  </title>'),
      "https://example.com/entry"
    );

    expect(empty?.title).toBe("https://example.com/entry");
  });

  test.each([
    ["og:image:url", '<meta property="og:image:url" content="https://example.com/a.png" />'],
    ["itemprop", '<meta itemprop="image" content="https://example.com/a.png" />'],
    ["twitter:image", '<meta name="twitter:image" content="https://example.com/a.png" />'],
    ["apple-touch-icon", '<link rel="apple-touch-icon" href="https://example.com/a.png" />'],
  ])("画像は %s まで探す", (_, tag) => {
    const meta = parseMeta(html(`<title>題</title>${tag}`), "https://example.com/entry");

    expect(meta?.image).toBe("https://example.com/a.png");
  });

  test("画像の相対参照を絶対化する", () => {
    const meta = parseMeta(
      html('<meta property="og:image" content="../img/a.png" />'),
      "https://example.com/blog/entry"
    );

    expect(meta?.image).toBe("https://example.com/img/a.png");
  });
});

describe("absoluteUrl", () => {
  test.each([
    ["/a.png", "https://example.com/a.png"],
    ["a.png", "https://example.com/blog/a.png"],
    ["//cdn.example.com/a.png", "https://cdn.example.com/a.png"],
    ["https://cdn.example.com/a.png", "https://cdn.example.com/a.png"],
    ["", ""],
    // 解決できないものは捨てる。壊れた src の <img> を出すより空の方がよい
    ["http://%", ""],
  ])("%s → %s", (src, expected) => {
    expect(absoluteUrl(src, "https://example.com/blog/entry")).toBe(expected);
  });

  test("基点が URL として読めなければ捨てる", () => {
    expect(absoluteUrl("/a.png", "壊れた基点")).toBe("");
  });
});

describe("サブドメインの判定", () => {
  test.each([
    ["https://blog.example.com/a", true],
    ["https://example.com/a", false],
    // www は通常のドメイン扱い。co.jp は 3 つに割れるがサブドメインではない
    ["https://www.example.com/a", false],
    ["https://example.co.jp/a", false],
    ["https://blog.example.co.jp/a", true],
    // URL として読めないものはホストを持たない。親を見に行かせない
    ["壊れた URL", false],
  ])("%s → %s", (url, expected) => {
    expect(isSubdomain(url)).toBe(expected);
  });

  test("親ドメインを返す", () => {
    expect(parentDomainUrl("https://blog.example.com/a")).toBe("https://example.com");
  });

  test("サブドメインでなければ親は無い", () => {
    expect(parentDomainUrl("https://example.com/a")).toBeUndefined();
  });
});

describe("表示用の URL", () => {
  test("ホスト名だけにする", () => {
    expect(shortenUrl("https://example.com/blog/entry?q=1")).toBe("example.com");
  });

  test("読めなければ渡されたものをそのまま出す", () => {
    expect(shortenUrl("壊れた URL")).toBe("壊れた URL");
  });
});
