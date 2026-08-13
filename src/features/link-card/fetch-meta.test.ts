import { describe, expect, test } from "bun:test";

import { type Fetcher, fetchMeta } from "@/features/link-card/fetch-meta";

const html = (head: string) => `<!doctype html><html><head>${head}</head></html>`;

const ogp = html(`
  <meta property="og:title" content="題" />
  <meta property="og:description" content="説明" />
  <meta property="og:image" content="/a.png" />
`);

/** 実ネットワークの代わり。呼ばれた URL と User-Agent を記録する */
function fakeFetch(
  handler: (url: string, ua: string) => Response | Promise<Response>
): Fetcher & { calls: { url: string; ua: string }[] } {
  const calls: { url: string; ua: string }[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    const ua = new Headers(init?.headers).get("user-agent") ?? "";
    calls.push({ url, ua });
    return await handler(url, ua);
  };
  return Object.assign(fetcher, { calls });
}

// 再試行の待ちは検査の対象ではないので 0 にする
const options = { retryDelayMs: 0 };

test("OGP を読んで返す", async () => {
  const fetcher = fakeFetch(() => new Response(ogp));

  const meta = await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher });

  expect(meta).toEqual({
    url: "https://example.com/entry",
    title: "題",
    description: "説明",
    image: "https://example.com/a.png",
  });
  // 1 段目で読めれば bot の UA は使わない
  expect(fetcher.calls).toHaveLength(1);
});

describe("2 段階の User-Agent", () => {
  test("OGP が無ければ bot の UA で読み直す", async () => {
    const fetcher = fakeFetch((_, ua) =>
      ua.includes("Discordbot") ? new Response(ogp) : new Response(html("<title>素の題</title>"))
    );

    const meta = await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher });

    expect(meta?.title).toBe("題");
    expect(fetcher.calls.map(({ ua }) => ua.includes("Discordbot"))).toEqual([false, true]);
  });

  test("bot でも OGP が無ければ title の結果へ倒す", async () => {
    const fetcher = fakeFetch(() => new Response(html("<title>素の題</title>")));

    const meta = await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher });

    expect(meta?.title).toBe("素の題");
  });
});

describe("再試行", () => {
  test("5xx は再試行する", async () => {
    let attempts = 0;
    const fetcher = fakeFetch(() => {
      attempts++;
      return attempts < 3 ? new Response("", { status: 503 }) : new Response(ogp);
    });

    const meta = await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher });

    expect(meta?.title).toBe("題");
    expect(attempts).toBe(3);
  });

  test("ネットワークエラーも再試行し、尽きたら次の UA へ進む", async () => {
    const fetcher = fakeFetch(() => {
      throw new Error("network");
    });

    const meta = await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher });

    expect(meta).toBeUndefined();
    // (初回 + 再試行 2 回) x UA 2 つ
    expect(fetcher.calls).toHaveLength(6);
  });

  test("4xx は再試行しない", async () => {
    const fetcher = fakeFetch(() => new Response("", { status: 404 }));

    expect(
      await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher })
    ).toBeUndefined();
    expect(fetcher.calls).toHaveLength(2);
  });
});

describe("サブドメインのフォールバック", () => {
  test("画像が無ければ親ドメインから借りる", async () => {
    const fetcher = fakeFetch((url) =>
      url === "https://example.com"
        ? new Response(html('<meta property="og:image" content="/parent.png" />'))
        : new Response(html('<meta property="og:title" content="題" />'))
    );

    const meta = await fetchMeta("https://blog.example.com/entry", { ...options, fetch: fetcher });

    expect(meta?.image).toBe("https://example.com/parent.png");
  });

  test("サブドメインでなければ親を見に行かない", async () => {
    const fetcher = fakeFetch(
      () => new Response(html('<meta property="og:title" content="題" />'))
    );

    const meta = await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher });

    expect(meta?.image).toBe("");
    expect(fetcher.calls).toHaveLength(1);
  });

  test("親からも取れなければ画像なしで返す", async () => {
    const fetcher = fakeFetch((url) =>
      url === "https://example.com"
        ? new Response("", { status: 500 })
        : new Response(html('<meta property="og:title" content="題" />'))
    );

    const meta = await fetchMeta("https://blog.example.com/entry", { ...options, fetch: fetcher });

    expect(meta).toEqual({
      url: "https://blog.example.com/entry",
      title: "題",
      description: "",
      image: "",
    });
  });
});

test("全て失敗すれば undefined。呼び出し側は素のリンクへ倒す", async () => {
  const fetcher = fakeFetch(() => new Response("", { status: 500 }));

  expect(
    await fetchMeta("https://example.com/entry", { ...options, fetch: fetcher })
  ).toBeUndefined();
});
