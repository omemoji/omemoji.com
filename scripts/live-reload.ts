import fs from "node:fs";

/**
 * 変更通知の受け口。`__dev` を頭に付けてサイトのルートと衝突させない。
 * サイト側に同じパスのページができたら、そちらが隠れるのではなくここが優先される
 */
export const RELOAD_PATH = "/__dev/reload";

/** css は `<link>` の差し替えで済む。それ以外はページ全体を作り直す */
export type ReloadEvent = "css" | "reload";

/**
 * 変更されたファイルに対する通知の種類。
 *
 * CSS だけ別扱いにするのは、リロードするとスクロール位置と `<details>` の開閉が
 * 失われるため。CSS は `<link>` を差し替えるだけで反映でき、状態が消えない
 */
export const reloadEvent = (file: string): ReloadEvent =>
  file.endsWith(".css") ? "css" : "reload";

/**
 * ブラウザ側の受け手。dev が返す HTML にだけ差し込む。
 *
 * 状態を持たないサイトなので、CSS 以外は全体リロードで足りる（§7.6）。
 * 新しい `<link>` を先に読み込ませてから古い方を外す。順序を逆にすると、
 * 読み込みの間だけスタイルの無い状態が見える。
 *
 * **接続が切れてもリロードしない。**EventSource は自前で繋ぎ直すので、
 * 切断を再起動と見なすと、通信が一瞬途切れただけでページが作り直される
 * （iframe の再生が止まる）。サーバの再起動は起動 ID の変化で見分ける
 */
const CLIENT_SCRIPT = `
const source = new EventSource(${JSON.stringify(RELOAD_PATH)});
let boot;

// 接続のたびに届く。値が変わっていれば dev サーバが立ち上げ直されている
source.addEventListener("hello", (event) => {
  if (boot !== undefined && boot !== event.data) {
    location.reload();
  }
  boot = event.data;
});

source.addEventListener("reload", () => location.reload());

source.addEventListener("css", () => {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const url = new URL(link.href);
    url.searchParams.set("v", String(Date.now()));

    const fresh = link.cloneNode();
    fresh.href = url.href;
    fresh.addEventListener("load", () => link.remove(), { once: true });
    link.after(fresh);
  }
});
`;

/** `</body>` の直前に差し込む。無い場合は末尾に付ける */
export function injectClient(html: string): string {
  const script = `<script type="module">${CLIENT_SCRIPT}</script>`;
  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : html + script;
}

export type LiveReload = {
  /** SSE の接続を返す */
  connect(): Response;
  /** この dev サーバの起動 ID。接続のたびに送り、再起動の検出に使う */
  readonly bootId: string;
  /** 監視を始める。戻り値を呼ぶと止まる */
  watch(dirs: string[]): () => void;
  /** 手で通知する。テスト用 */
  notify(event: ReloadEvent): void;
};

/**
 * 変更を購読しているブラウザへ通知する。
 *
 * 何が変わったかは伝えない。dev はリクエストのたびにコンテンツを読み直すため、
 * 通知は「もう一度取りに来い」の合図で足りる（§7.9 の「依存グラフを持たない」と同じ理由）
 */
export function createLiveReload(): LiveReload {
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const encoder = new TextEncoder();
  // プロセスに 1 つ。`bun --hot` の差し替えでは作り直されない（dev.ts が globalThis に置く）
  const bootId = crypto.randomUUID();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const notify = (event: ReloadEvent): void => {
    const chunk = encoder.encode(`event: ${event}\ndata: 1\n\n`);
    for (const client of clients) {
      try {
        client.enqueue(chunk);
      } catch {
        // 既に閉じている接続。cancel が呼ばれる前に落ちることがある
        clients.delete(client);
      }
    }
  };

  /**
   * 何も起きていない間も一定間隔で送る。
   *
   * 送るものが無いと接続が切れ、繋ぎ直すまでの変更を取りこぼす。
   * 接続している相手がいる間だけ動かす
   */
  const keepAlive = (): void => {
    heartbeat ??= setInterval(() => {
      if (clients.size === 0) {
        clearInterval(heartbeat);
        heartbeat = undefined;
        return;
      }
      for (const client of clients) {
        try {
          client.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clients.delete(client);
        }
      }
    }, 5000);
  };

  const connect = (): Response => {
    let self: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        self = controller;
        clients.add(controller);
        // 起動 ID を送って接続を確定させる。ブラウザは値の変化で再起動を見分ける
        controller.enqueue(encoder.encode(`event: hello\ndata: ${bootId}\n\n`));
        keepAlive();
      },
      cancel() {
        clients.delete(self);
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  };

  const watch = (dirs: string[]): (() => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: ReloadEvent = "css";

    const watchers = dirs
      .filter((dir) => fs.existsSync(dir))
      .map((dir) =>
        fs.watch(dir, { recursive: true }, (_, file) => {
          // 1 回の保存で複数のイベントが来る。まとめて 1 通知にする。
          // css 以外が 1 つでも混ざれば全体リロードへ倒す
          if (reloadEvent(file ?? "") === "reload") {
            pending = "reload";
          }
          clearTimeout(timer);
          timer = setTimeout(() => {
            notify(pending);
            pending = "css";
          }, 50);
        })
      );

    return () => {
      clearTimeout(timer);
      for (const watcher of watchers) {
        watcher.close();
      }
    };
  };

  return { connect, bootId, notify, watch };
}
