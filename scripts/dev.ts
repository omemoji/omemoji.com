import fs from "node:fs";
import path from "node:path";

import { collectImages, type ImageAsset } from "@/features/image/assets";
import { setImageManifest } from "@/features/image/manifest";
import { type ImageManifest, measureImages } from "@/features/image/optimize";
import { collectLinkCards } from "@/features/link-card/collect";
import { setLinkCardManifest } from "@/features/link-card/manifest";
import { collectAllLinkCardUrls } from "@/features/link-card/urls";
import { buildRoutes } from "@/routes";
import {
  contentDir,
  imageSources,
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
function staticResponse(pathname: string, images: ImageAsset[]): Response | undefined {
  if (pathname === `/${stylesheet.href}`) {
    // out/ へコピーしたものではなく原本を返すため、編集がそのまま反映される
    return new Response(Bun.file(stylesheet.file));
  }

  // 画像は content/ に置いたまま配信する。URL の対応はビルドと同じ表から引くので、
  // dev だけ別の場所を指すということが起きない
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
let measured: { stamp: string; manifest: ImageManifest } | undefined;

async function imageManifest(images: ImageAsset[]): Promise<ImageManifest> {
  const stamp = images.map(({ from }) => `${from}:${fs.statSync(from).mtimeMs}`).join("\n");
  if (measured?.stamp !== stamp) {
    measured = { stamp, manifest: await measureImages(images) };
  }
  return measured.manifest;
}

/**
 * dev だけが出す画面（404 / 未実装 / エラー）。
 *
 * サイトのレイアウトは通さない。**サイトの見た目に紛れないことが大事**で、
 * 例外で落ちているのかページがそう描かれているのかを取り違えないようにする。
 * ライブリロードは差し込む。直したら勝手に開き直る
 */
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
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);

    // 変更通知の購読。ページより先に見る
    if (pathname === RELOAD_PATH) {
      return reload.connect();
    }

    // コンテンツの読み込みから描画までを 1 つの try で包む。
    // frontmatter の書き損じ（zod の検証エラー）もここに来るため、
    // 描画だけを包むとサーバのログにしか出ず、ブラウザは素の 500 を見ることになる
    try {
      // 毎回読み直す。記事を書き換えたらリロードだけで反映される。
      // 下書きも表示する（build.ts は本番として除外する）
      const content = loadContent({ includeDrafts: true });
      const images = collectImages(imageSources(content));

      const asset = staticResponse(pathname, images);
      if (asset) {
        return asset;
      }

      // 原寸を配信したまま寸法だけを出す。本番と同じく場所が確保され、見た目のずれが起きない
      setImageManifest(await imageManifest(images));

      // ネットワークは叩かない。取得済みの URL だけがカードになり、残りは素のリンクで出る
      const links = await collectLinkCards(collectAllLinkCardUrls(markdownBodies(content)), {
        cacheFile: linkCacheFile,
        cacheDir: linkCacheDir,
        offline: true,
      });
      setLinkCardManifest(links.manifest);

      const routes = buildRoutes(content);
      const route = routes.find((r) => r.path === normalize(pathname));

      if (!route) {
        return page(404, "404 ページがありません", list(routes.map((r) => r.path)));
      }

      // ビルドと同じ関数を通す。dev だけ結果が違うということが起きない
      const html = await renderRoute(route);
      if (html === undefined) {
        // ルート自体は存在するので 404 とは区別する
        return page(501, `${route.page} は未実装です`, list(routes.map((r) => r.path)));
      }

      // 差し込むのは dev だけ。ビルドは同じ renderRoute を使うが素の HTML のまま
      return new Response(injectClient(html), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      return errorPage(error);
    }
  },
});

console.log(`dev server: ${server.url}`);
