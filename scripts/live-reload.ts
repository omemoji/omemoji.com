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
 * 読み込みの間だけスタイルの無い状態が見える
 */
const CLIENT_SCRIPT = `
const source = new EventSource(${JSON.stringify(RELOAD_PATH)});

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

// dev サーバを落とすと接続が切れる。再起動を待って自動で戻る
source.addEventListener("error", () => {
  setTimeout(() => fetch(location.href, { method: "HEAD" }).then(() => location.reload()).catch(() => {}), 1000);
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

  const connect = (): Response => {
    let self: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        self = controller;
        clients.add(controller);
        // 最初の 1 バイトを送って接続を確定させる（コメント行は無視される）
        controller.enqueue(encoder.encode(": connected\n\n"));
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

  return { connect, watch, notify };
}
