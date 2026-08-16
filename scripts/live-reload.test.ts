import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createLiveReload,
  injectClient,
  RELOAD_PATH,
  type ReloadEvent,
  reloadEvent,
} from "./live-reload";

describe("通知の種類", () => {
  test.each<[string, ReloadEvent]>([
    ["src/styles/globals.css", "css"],
    ["content/articles/2025/a/index.md", "reload"],
    ["src/components/Image.tsx", "reload"],
    // 何が変わったか分からない場合は安全側（全体リロード）へ倒す
    ["", "reload"],
  ])("%s → %s", (file, expected) => {
    expect(reloadEvent(file)).toBe(expected);
  });
});

describe("クライアントの差し込み", () => {
  test("</body> の直前に入る", () => {
    const html = injectClient("<html><body><p>本文</p></body></html>");

    expect(html).toContain(`</script></body>`);
    expect(html).toContain(RELOAD_PATH);
  });

  test("</body> が無くても落とさない", () => {
    expect(injectClient("<p>断片</p>")).toContain("<script");
  });
});

/** 実際に Bun.serve へ繋いで確かめる。WebSocket はサーバ抜きでは動かない */
const withServer = async (
  reload: ReturnType<typeof createLiveReload>,
  body: (url: string) => Promise<void>
): Promise<void> => {
  const server = Bun.serve({
    port: 0,
    websocket: reload.handlers,
    fetch: (request, server) => reload.upgrade(request, server) ?? new Response("no"),
  });

  try {
    await body(`ws://localhost:${server.port}${RELOAD_PATH}`);
  } finally {
    server.stop(true);
  }
};

/** 繋いで、最初に届いたメッセージを返す */
const firstMessage = (url: string): Promise<string> =>
  new Promise((resolve) => {
    const socket = new WebSocket(url);
    socket.addEventListener("message", (event) => {
      resolve(String(event.data));
      socket.close();
    });
  });

describe("再起動の検出", () => {
  test("繋ぐと起動 ID が届く", async () => {
    const reload = createLiveReload();

    await withServer(reload, async (url) => {
      expect(await firstMessage(url)).toBe(`hello ${reload.bootId}`);
    });
  });

  test("同じサーバなら繋ぎ直しても同じ ID", async () => {
    // ここが変わると、通信が一瞬切れただけでブラウザがリロードしてしまう
    const reload = createLiveReload();

    await withServer(reload, async (url) => {
      expect(await firstMessage(url)).toBe(await firstMessage(url));
    });
  });

  test("立ち上げ直せば ID が変わる", () => {
    expect(createLiveReload().bootId).not.toBe(createLiveReload().bootId);
  });
});

describe("受け手の作り", () => {
  test("HTTP の接続を握らない（WebSocket を使う）", () => {
    const script = injectClient("<body></body>");

    // SSE は HTTP の同時接続数（6）を 1 本削る。離れたページが握ったままだと
    // 次の遷移が空きを待ち、一度詰まると手動リロードでも直らない
    expect(script).toContain("new WebSocket(");
    expect(script).not.toContain("EventSource");
  });

  test("ページを離れる時点で接続を手放す", () => {
    expect(injectClient("<body></body>")).toContain('addEventListener("pagehide"');
  });
});

describe("受け口", () => {
  test("リロード用のパス以外は受け取らない", async () => {
    const reload = createLiveReload();

    // ページのハンドラより先に呼ばれる。undefined を返して後段へ譲る
    await withServer(reload, async (url) => {
      const origin = url.replace(/^ws/, "http").replace(RELOAD_PATH, "");
      const response = await fetch(`${origin}/articles`);

      expect(await response.text()).toBe("no");
    });
  });

  test("ブラウザから送られても落とさない", async () => {
    const reload = createLiveReload();

    await withServer(reload, async (url) => {
      const socket = new WebSocket(url);
      await new Promise((resolve) => socket.addEventListener("open", resolve));
      socket.send("何か");

      // 通知は一方通行。受け取っても何も起きず、接続も切れない
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(reload.size()).toBe(1);
      socket.close();
    });
  });
});

describe("購読", () => {
  test("繋いでいるページへ通知が届く", async () => {
    const reload = createLiveReload();

    await withServer(reload, async (url) => {
      const socket = new WebSocket(url);
      const received = new Promise<string>((resolve) => {
        socket.addEventListener("message", (event) => {
          // hello は接続時に届く。その次を待つ
          if (String(event.data) !== `hello ${reload.bootId}`) {
            resolve(String(event.data));
          }
        });
      });

      await new Promise((resolve) => socket.addEventListener("open", resolve));
      // 接続が数えられてから通知する
      while (reload.size() === 0) {
        await Bun.sleep(5);
      }
      reload.notify("css");

      expect(await received).toBe("css");
      socket.close();
    });
  });

  test("繋いでいなくても通知で落ちない", () => {
    expect(() => createLiveReload().notify("reload")).not.toThrow();
  });

  test("離れた接続は数から外れる", async () => {
    const reload = createLiveReload();

    await withServer(reload, async (url) => {
      const socket = new WebSocket(url);
      await new Promise((resolve) => socket.addEventListener("open", resolve));
      while (reload.size() === 0) {
        await Bun.sleep(5);
      }

      socket.close();
      while (reload.size() > 0) {
        await Bun.sleep(5);
      }
      expect(reload.size()).toBe(0);
    });
  });
});

describe("監視", () => {
  let dir = "";
  let stop: (() => void) | undefined;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "omemoji-watch-"));
  });

  afterEach(() => {
    stop?.();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** 監視は OS 依存で遅れることがあるため、届くまで待つ */
  const nextEvent = async (reload: ReturnType<typeof createLiveReload>): Promise<string> => {
    let received = "";
    await withServer(reload, async (url) => {
      const socket = new WebSocket(url);
      const message = new Promise<string>((resolve) => {
        socket.addEventListener("message", (event) => {
          if (!String(event.data).startsWith("hello")) {
            resolve(String(event.data));
          }
        });
      });
      await new Promise((resolve) => socket.addEventListener("open", resolve));
      while (reload.size() === 0) {
        await Bun.sleep(5);
      }

      fs.writeFileSync(path.join(dir, pending), body);
      received = await message;
      socket.close();
    });
    return received;
  };

  let pending = "";
  let body = "";

  test("CSS の変更は css として伝える", async () => {
    const reload = createLiveReload();
    stop = reload.watch([dir]);
    pending = "globals.css";
    body = "body { color: red }";

    expect(await nextEvent(reload)).toBe("css");
  });

  test("CSS 以外の変更は reload として伝える", async () => {
    const reload = createLiveReload();
    stop = reload.watch([dir]);
    pending = "index.md";
    body = "# 見出し";

    expect(await nextEvent(reload)).toBe("reload");
  });

  test("存在しないディレクトリは黙って飛ばす", () => {
    const reload = createLiveReload();

    expect(() => {
      stop = reload.watch([path.join(dir, "none")]);
    }).not.toThrow();
  });
});
