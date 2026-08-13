import fs from "node:fs";
import path from "node:path";

import { setAnalyticsEnabled } from "@/components/Analytics";
import { collectImages, type ImageAsset } from "@/features/image/assets";
import { setImageManifest } from "@/features/image/manifest";
import {
  cachedImages,
  type ImageManifest,
  type ImageTask,
  measureImages,
  optimizeImages,
} from "@/features/image/optimize";
import { collectLinkCards } from "@/features/link-card/collect";
import { setLinkCardManifest } from "@/features/link-card/manifest";
import { collectAllLinkCardUrls } from "@/features/link-card/urls";
import { buildRoutes, type Content } from "@/routes";
import {
  contentDir,
  imageCacheDir,
  imageSources,
  imageVariants,
  katex,
  linkCacheDir,
  linkCacheFile,
  loadContent,
  markdownBodies,
  publicDir,
  renderRoute,
  rootDir,
  stylesheet,
} from "./build";
import { createLiveReload, injectClient, RELOAD_PATH } from "./live-reload";

// 分割代入で受ける。process.env はインデックスシグネチャを持つため、
// ドットアクセスは tsconfig の noPropertyAccessFromIndexSignature に触れ、
// 添字アクセスは biome の useLiteralKeys に触れる
const { PORT } = process.env;
const port = Number(PORT ?? 3000);

/**
 * 監視と購読は `bun --hot` の差し替えを跨いで残す。
 * モジュールが再評価されるたびに新しい監視を足すと、保存 1 回で何度も通知が飛ぶ
 */
declare global {
  var __liveReload: { reload: ReturnType<typeof createLiveReload>; stop: () => void } | undefined;
}

globalThis.__liveReload ??= (() => {
  const reload = createLiveReload();
  // src と content の変更でページを作り直す。out/ は dev では使わない
  const stop = reload.watch([path.join(rootDir, "src"), path.join(rootDir, "content"), publicDir]);
  return { reload, stop };
})();

const { reload } = globalThis.__liveReload;

setAnalyticsEnabled(false);

/**
 * 取得を試した URL。`bun --hot` の差し替えを跨いで残す。
 *
 * 取れなかった URL を毎リクエスト取り直すと、リンク先が落ちている間ずっと
 * 待たされ続ける。取り直したいときは dev サーバを立ち上げ直す
 */
declare global {
  var __linkCardAttempts: Set<string> | undefined;
}

globalThis.__linkCardAttempts ??= new Set<string>();
const attempted = globalThis.__linkCardAttempts;

/** 取得中かどうか。同じ URL に何本も走らせない */
let warming: Promise<void> | undefined;

/**
 * まだキャッシュに無いリンク先を裏で取りに行く。
 *
 * **リクエストは待たせない。**リンク先が遅いと 1 ページの表示に何十秒もかかるため、
 * その場は素のリンクで返し、取得できた時点でライブリロードで知らせる。
 * 画像は本番と同じサムネイルを同じキャッシュに作る（dev はそこを配信している）ので、
 * 次の本番ビルドはこの結果をそのまま使える
 */
function warmLinkCards(urls: string[]): void {
  const targets = urls.filter((url) => !attempted.has(url));
  if (warming || targets.length === 0) {
    return;
  }

  for (const url of targets) {
    attempted.add(url);
  }
  console.log(`fetching ${targets.length} link card(s)...`);

  warming = collectLinkCards(targets, { cacheFile: linkCacheFile, cacheDir: linkCacheDir })
    .then(({ fetched, failed }) => {
      console.log(
        `link cards: ${fetched} fetched${failed.length > 0 ? `, ${failed.length} failed` : ""}`
      );
      if (fetched > 0) {
        // 取得できた分をカードとして出し直す
        reload.notify("reload");
      }
    })
    .catch((error: unknown) => console.error(error))
    .finally(() => {
      warming = undefined;
    });
}

/**
 * リクエストされたパスを routes.ts のパスへ正規化する。
 * `/articles/x.html`（本番の形）と末尾スラッシュのどちらでも引けるようにする。
 */
const normalize = (pathname: string): string => {
  const stripped = pathname.replace(/\.html$/, "").replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
};

const fileResponse = (file: string, root: string): Response | undefined => {
  // 指定した根の外へ出る参照を弾く
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return undefined;
  }
  return new Response(Bun.file(file));
};

/** ビルドが out/ へ複製するのと同じものを、原本のまま返す */
function staticResponse(
  pathname: string,
  images: ImageAsset[],
  optimized: Record<string, string>
): Response | undefined {
  if (pathname === `/${stylesheet.href}`) {
    // out/ へコピーしたものではなく原本を返すため、編集がそのまま反映される
    return new Response(Bun.file(stylesheet.file));
  }

  // 変換済みの画像はキャッシュから返す。dev のために作り直さない
  const converted = optimized[pathname];
  if (converted) {
    return new Response(Bun.file(converted));
  }

  // 未変換の画像は content/ に置いたまま原寸で配信する。URL の対応はビルドと
  // 同じ表から引くので、dev だけ別の場所を指すということが起きない
  const image = images.find(({ to }) => `/${to}` === pathname);
  if (image) {
    return fileResponse(image.from, contentDir);
  }

  // KaTeX のスタイルとフォント。ビルドが out/ へ複製するのと同じ実体を返す
  if (pathname.startsWith("/katex/")) {
    return fileResponse(path.join(katex.dir, pathname.slice("/katex/".length)), katex.dir);
  }

  // リンクカードのサムネイル。ビルドが out/ へ複製するのと同じ実体を返す
  if (pathname.startsWith("/images/ogp_link/")) {
    return fileResponse(path.join(linkCacheDir, path.basename(pathname)), linkCacheDir);
  }

  return fileResponse(path.join(publicDir, pathname), publicDir);
}

/**
 * 寸法マニフェストを覚えておく。AVIF の変換は dev では走らせない（1 枚 100ms 近くかかる）。
 *
 * 測るのはヘッダだけだが、それでも全リクエストで 100 枚読むのは無駄なので、
 * ファイルの構成と更新時刻が変わらない限り測り直さない。
 */
type ImageState = {
  manifest: ImageManifest;
  /** 配信 URL → キャッシュ上の実体 */
  files: Record<string, string>;
  missing: ImageTask[];
};

let measured: { stamp: string; state: ImageState } | undefined;

async function imageState(images: ImageAsset[], content: Content): Promise<ImageState> {
  const stamp = images.map(({ from }) => `${from}:${fs.statSync(from).mtimeMs}`).join("\n");
  if (measured?.stamp === stamp) {
    return measured.state;
  }

  // 変換済みのものはキャッシュから、未変換のものは原寸 + 寸法で埋める。
  // 原寸を指す側も width / height は出すので、どちらでもレイアウトは同じになる
  const cached = cachedImages(images, {
    cacheDir: imageCacheDir,
    variants: imageVariants(content),
  });
  const sized = await measureImages(images);

  const manifest: ImageManifest = {};
  for (const [url, variants] of Object.entries(sized)) {
    manifest[url] = { ...variants, ...cached.manifest[url] };
  }

  measured = { stamp, state: { manifest, files: cached.files, missing: cached.missing } };
  return measured.state;
}

/** 変換中かどうか。同じ画像に何本も走らせない */
let converting: Promise<void> | undefined;

/**
 * まだ変換されていない画像を裏で変換する。
 *
 * リンクカードと同じ考え方で、リクエストは待たせない。変換は 1 枚 100ms 近くかかるが、
 * 一度作ればビルドと共用のキャッシュに残り、次からは即座に配信できる
 */
function convertImages(missing: ImageTask[]): void {
  if (converting || missing.length === 0) {
    return;
  }
  console.log(`converting ${missing.length} image(s)...`);

  const assets = [...new Set(missing.map(({ asset }) => asset))];
  const variants = [...new Map(missing.map(({ variant }) => [variant.name, variant])).values()];

  converting = optimizeImages(assets, { cacheDir: imageCacheDir, variants })
    .then(({ converted }) => {
      console.log(`images: ${converted} converted`);
      // 次のリクエストで作り直させる。マニフェストの鍵は mtime なので明示的に捨てる
      measured = undefined;
      if (converted > 0) {
        reload.notify("reload");
      }
    })
    .catch((error: unknown) => console.error(error))
    .finally(() => {
      converting = undefined;
    });
}

/**
 * dev だけが出す画面（404 / 未実装 / エラー）。
 *
 * サイトのレイアウトは通さない。**サイトの見た目に紛れないことが大事**で、
 * 例外で落ちているのかページがそう描かれているのかを取り違えないようにする。
 * ライブリロードは差し込む。直したら勝手に開き直る
 */
/**
 * リンクカードにする URL を覚えておく。
 *
 * 収集は Markdown の再パースで、実測 79ms とリクエストの固定費として重い。
 * 本文が変わらない限り結果も変わらないため、本文そのものを鍵にして覚える
 */
let collected: { stamp: string; urls: string[] } | undefined;

function linkCardUrls(bodies: string[]): string[] {
  const stamp = bodies.join("\u0000");
  if (collected?.stamp !== stamp) {
    collected = { stamp, urls: collectAllLinkCardUrls(bodies) };
  }
  return collected.urls;
}

/**
 * 何にどれだけかかったかを出す。**遅さの切り分けはこれが無いと始まらない。**
 * 変更通知（繋ぎっぱなし）は数えても意味が無いので出さない
 */
const logRequest = (pathname: string, started: number, status: number): void => {
  console.log(
    `${String(status).padEnd(3)} ${`${Math.round(performance.now() - started)}ms`.padStart(7)}  ${pathname}`
  );
};

/**
 * 遷移が捨てられたか。
 *
 * ブラウザは次のページへ進むと前のリクエストを中断する。**気付かずに描き続けると、
 * 見捨てられたページの変換で、いま待っているページが後ろに並ぶ。**
 * 中断は異常ではないので、記録もエラー画面も出さずに畳む
 */
const abandoned = (request: Request): Response | undefined =>
  request.signal.aborted ? new Response(null, { status: 499 }) : undefined;

const page = (status: number, title: string, body: string) =>
  new Response(
    injectClient(`<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0 auto; padding: 2rem 1rem; max-inline-size: 60rem; line-height: 1.7;
             font-family: ui-sans-serif, system-ui, sans-serif; }
      h1 { font-size: 1.5rem; border-block-end: 3px solid #d50000; padding-block-end: 0.5rem; }
      pre { padding: 1rem; overflow: auto; background: light-dark(#eee, #222); border-radius: 0.5rem;
            font-size: 0.875rem; line-height: 1.5; }
      ul { padding-inline-start: 1.5rem; }
      li { list-style: disc; }
      footer { margin-block-start: 2rem; color: light-dark(#666, #9c9c9c); font-size: 0.875rem; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${body}
    <footer>omemoji.com dev server — 保存すると自動で読み直します</footer>
  </body>
</html>`),
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );

/** 例外を読める形にする。原因を先頭に出し、スタックはそのまま見せる */
const errorPage = (error: unknown): Response => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const cause = error instanceof Error && error.cause ? String(error.cause) : undefined;

  console.error(error);
  return page(
    500,
    "500 描画に失敗しました",
    `<pre>${Bun.escapeHTML(detail)}</pre>${cause ? `<h2>cause</h2><pre>${Bun.escapeHTML(cause)}</pre>` : ""}`
  );
};

const list = (paths: string[]) =>
  `<ul>${paths.map((p) => `<li><a href="${p}">${p}</a></li>`).join("")}</ul>`;

const server = Bun.serve({
  port,
  // 既定の 10 秒では変更通知の接続が繋ぎっぱなしにできない。
  // 切れるたびに繋ぎ直すと、その間の変更を取りこぼす（0 で無効）
  idleTimeout: 0,
  websocket: reload.handlers,
  async fetch(request, server) {
    const started = performance.now();
    const pathname = decodeURIComponent(new URL(request.url).pathname);

    // 変更通知の購読。ページより先に見る。切り替わった場合は応答を返さない
    if (pathname === RELOAD_PATH) {
      return reload.upgrade(request, server);
    }

    // コンテンツの読み込みから描画までを 1 つの try で包む。
    // frontmatter の書き損じ（zod の検証エラー）もここに来るため、
    // 描画だけを包むとサーバのログにしか出ず、ブラウザは素の 500 を見ることになる
    try {
      // 毎回読み直す。記事を書き換えたらリロードだけで反映される。
      // 下書きも表示する（build.ts は本番として除外する）
      const content = loadContent({ includeDrafts: true });
      const images = collectImages(imageSources(content));
      const state = await imageState(images, content);

      const asset = staticResponse(pathname, images, state.files);
      if (asset) {
        logRequest(pathname, started, asset.status);
        return asset;
      }

      // 変換済みならそれを、まだなら原寸を指す。どちらも寸法は出すので見た目のずれは起きない
      setImageManifest(state.manifest);
      convertImages(state.missing);
      const leftEarly = abandoned(request);
      if (leftEarly) {
        logRequest(pathname, started, leftEarly.status);
        return leftEarly;
      }

      // 描画に使うのはキャッシュだけ。未取得の分はこのリクエストでは素のリンクになる
      const links = await collectLinkCards(linkCardUrls(markdownBodies(content)), {
        cacheFile: linkCacheFile,
        cacheDir: linkCacheDir,
        offline: true,
      });
      setLinkCardManifest(links.manifest);

      // 未取得の分は裏で取りに行き、揃ったらライブリロードで出し直す。
      // 下書きの記事もここを通るので、書きながらカードを確認できる
      warmLinkCards(links.failed);

      const routes = buildRoutes(content);
      const route = routes.find((r) => r.path === normalize(pathname));

      if (!route) {
        logRequest(pathname, started, 404);
        return page(404, "404 ページがありません", list(routes.map((r) => r.path)));
      }

      // 変換は 1 ページで 100ms を超えることがある。始める前に見捨てられていないか確かめる
      const leftBeforeRender = abandoned(request);
      if (leftBeforeRender) {
        logRequest(pathname, started, leftBeforeRender.status);
        return leftBeforeRender;
      }

      // ビルドと同じ関数を通す。dev だけ結果が違うということが起きない
      const html = await renderRoute(route);
      if (html === undefined) {
        // ルート自体は存在するので 404 とは区別する
        logRequest(pathname, started, 501);
        return page(501, `${route.page} は未実装です`, list(routes.map((r) => r.path)));
      }

      logRequest(pathname, started, 200);

      // 差し込むのは dev だけ。ビルドは同じ renderRoute を使うが素の HTML のまま
      return new Response(injectClient(html), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      logRequest(pathname, started, 500);
      return errorPage(error);
    }
  },
});

console.log(`dev server: ${server.url}`);
