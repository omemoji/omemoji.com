import fs from "node:fs";
import type { Server, ServerWebSocket } from "bun";

/**
 * 変更通知の受け口。`__dev` を頭に付けてサイトのルートと衝突させない。
 *
 * **SSE ではなく WebSocket を使う。**SSE は HTTP の接続を 1 本占め続けるため、
 * ブラウザの同時接続数（HTTP/1.1 では 6）を削る。離れたページの接続が残ると
 * 次の遷移がその空きを待つことになり、一度詰まると手動でリロードしても直らない。
 * WebSocket はこの制限の対象外
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
 * **切断そのものではリロードしない。**繋ぎ直すだけにする。切断を再起動と見なすと、
 * 通信が一瞬途切れただけでページが作り直される（iframe の再生が止まる）。
 * サーバの再起動は起動 ID の変化で見分ける
 */
const CLIENT_SCRIPT = `
let socket;
let boot;
let timer;

const connect = () => {
  socket = new WebSocket(location.origin.replace(/^http/, "ws") + ${JSON.stringify(RELOAD_PATH)});

  socket.addEventListener("message", (event) => {
    const [kind, value] = event.data.split(" ");

    if (kind === "hello") {
      // 値が変わっていれば dev サーバが立ち上げ直されている
      if (boot !== undefined && boot !== value) location.reload();
      boot = value;
      return;
    }

    if (kind === "reload") location.reload();

    if (kind === "css") {
      for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
        const url = new URL(link.href);
        url.searchParams.set("v", String(Date.now()));

        const fresh = link.cloneNode();
        fresh.href = url.href;
        fresh.addEventListener("load", () => link.remove(), { once: true });
        link.after(fresh);
      }
    }
  });

  // 落ちている間は繋ぎ直し続ける。立ち上げ直したことは hello の値で気付く
  socket.addEventListener("close", () => {
    clearTimeout(timer);
    timer = setTimeout(connect, 1000);
  });
};

connect();

// ページを離れる時点で手放す。戻る操作で復元された場合（bfcache）は繋ぎ直す
addEventListener("pagehide", () => {
  clearTimeout(timer);
  socket?.close();
});
addEventListener("pageshow", (event) => {
  if (event.persisted) connect();
});
`;

/** `</body>` の直前に差し込む。無い場合は末尾に付ける */
export function injectClient(html: string): string {
  const script = `<script type="module">${CLIENT_SCRIPT}</script>`;
  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : html + script;
}

/** ブラウザ 1 枚ぶんの接続 */
export type ReloadSocket = ServerWebSocket<unknown>;

export type LiveReload = {
  /** この dev サーバの起動 ID。繋がるたびに送り、再起動の検出に使う */
  readonly bootId: string;
  /** WebSocket への切り替え。ページのハンドラより先に呼ぶ */
  upgrade(request: Request, server: Server<unknown>): Response | undefined;
  /** `Bun.serve` の `websocket` へそのまま渡す */
  readonly handlers: {
    open(ws: ReloadSocket): void;
    close(ws: ReloadSocket): void;
    /** ブラウザからは何も送らない。型を満たすために置く */
    message(): void;
  };
  /** 購読している全てのページへ通知する */
  notify(event: ReloadEvent): void;
  /** 監視を始める。戻り値を呼ぶと止まる */
  watch(dirs: string[]): () => void;
  /** 繋がっているページの数。テストと切り分け用 */
  readonly size: () => number;
};

/**
 * 変更を購読しているブラウザへ通知する。
 *
 * 何が変わったかは伝えない。dev はリクエストのたびにコンテンツを読み直すため、
 * 通知は「もう一度取りに来い」の合図で足りる（§7.9 の「依存グラフを持たない」と同じ理由）
 */
export function createLiveReload(): LiveReload {
  const clients = new Set<ReloadSocket>();
  // プロセスに 1 つ。`bun --hot` の差し替えでは作り直されない（dev.ts が globalThis に置く）
  const bootId = crypto.randomUUID();

  const notify = (event: ReloadEvent): void => {
    for (const client of clients) {
      client.send(event);
    }
  };

  const upgrade = (request: Request, server: Server<unknown>): Response | undefined => {
    if (new URL(request.url).pathname !== RELOAD_PATH) {
      return undefined;
    }
    // 切り替えに成功した場合は応答を返してはいけない。失敗したときだけ組み立てる
    return server.upgrade(request, { data: undefined })
      ? undefined
      : new Response("upgrade failed", { status: 400 });
  };

  const handlers = {
    open(ws: ReloadSocket): void {
      clients.add(ws);
      ws.send(`hello ${bootId}`);
    },
    close(ws: ReloadSocket): void {
      clients.delete(ws);
    },
    message(): void {
      // 受け取るものは無い。通知は一方通行
    },
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

  return { bootId, upgrade, handlers, notify, watch, size: () => clients.size };
}
