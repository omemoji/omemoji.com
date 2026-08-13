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

describe("再起動の検出", () => {
  const firstEvent = async (response: Response): Promise<string> => {
    const reader = response.body?.getReader();
    const { value } = (await reader?.read()) ?? {};
    return new TextDecoder().decode(value);
  };

  test("接続すると起動 ID が届く", async () => {
    const reload = createLiveReload();

    expect(await firstEvent(reload.connect())).toBe(`event: hello\ndata: ${reload.bootId}\n\n`);
  });

  test("同じサーバなら繋ぎ直しても同じ ID", async () => {
    // ここが変わると、通信が一瞬切れただけでブラウザがリロードしてしまう
    const reload = createLiveReload();

    expect(await firstEvent(reload.connect())).toBe(await firstEvent(reload.connect()));
  });

  test("立ち上げ直せば ID が変わる", () => {
    expect(createLiveReload().bootId).not.toBe(createLiveReload().bootId);
  });
});

describe("受け手の作り", () => {
  test("切断そのものではリロードしない", () => {
    const script = injectClient("<body></body>");

    // EventSource は自前で繋ぎ直す。切断を再起動と見なすと、
    // 通信が途切れるたびにページが作り直される（iframe の再生が止まる）
    expect(script).not.toContain('addEventListener("error"');
    expect(script).toContain('addEventListener("hello"');
  });
});

describe("購読", () => {
  /** SSE のストリームから 1 つ分のイベントを読む */
  const read = async (response: Response): Promise<string> => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    for (let i = 0; i < 5 && reader; i++) {
      const { value } = await reader.read();
      const chunk = decoder.decode(value);
      // 接続時に届く hello と、繋ぎっぱなしにするための ping は読み飛ばす
      if (chunk.startsWith("event:") && !chunk.startsWith("event: hello")) {
        return chunk;
      }
    }
    return "";
  };

  test("接続した相手に通知が届く", async () => {
    const reload = createLiveReload();
    const response = reload.connect();

    expect(response.headers.get("content-type")).toBe("text/event-stream");

    const received = read(response);
    reload.notify("css");

    expect(await received).toContain("event: css");
  });

  test("接続していなくても通知で落ちない", () => {
    expect(() => createLiveReload().notify("reload")).not.toThrow();
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

  /** 通知を待つ。監視は OS 依存で遅れることがあるため余裕を持たせる */
  const nextEvent = (reload: ReturnType<typeof createLiveReload>): Promise<string> => {
    const response = reload.connect();
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    return (async () => {
      for (let i = 0; i < 10 && reader; i++) {
        const { value } = await reader.read();
        const chunk = decoder.decode(value);
        if (chunk.startsWith("event:") && !chunk.startsWith("event: hello")) {
          return chunk;
        }
      }
      return "";
    })();
  };

  test("CSS の変更は css として伝える", async () => {
    const reload = createLiveReload();
    stop = reload.watch([dir]);
    const received = nextEvent(reload);

    fs.writeFileSync(path.join(dir, "globals.css"), "body { color: red }");

    expect(await received).toContain("event: css");
  });

  test("CSS 以外の変更は reload として伝える", async () => {
    const reload = createLiveReload();
    stop = reload.watch([dir]);
    const received = nextEvent(reload);

    fs.writeFileSync(path.join(dir, "index.md"), "# 見出し");

    expect(await received).toContain("event: reload");
  });

  test("存在しないディレクトリは黙って飛ばす", () => {
    const reload = createLiveReload();

    expect(() => {
      stop = reload.watch([path.join(dir, "none")]);
    }).not.toThrow();
  });
});
