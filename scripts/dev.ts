import fs from "node:fs";
import path from "node:path";

import { collectImages, type ImageAsset } from "@/features/image/assets";
import { setImageManifest } from "@/features/image/manifest";
import { type ImageManifest, measureImages } from "@/features/image/optimize";
import { buildRoutes } from "@/routes";
import { contentDir, imageSources, loadContent, publicDir, renderRoute, stylesheet } from "./build";

// 分割代入で受ける。process.env はインデックスシグネチャを持つため、
// ドットアクセスは tsconfig の noPropertyAccessFromIndexSignature に触れ、
// 添字アクセスは biome の useLiteralKeys に触れる
const { PORT } = process.env;
const port = Number(PORT ?? 3000);

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

const page = (status: number, title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${body}</body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );

const list = (paths: string[]) =>
  `<ul>${paths.map((p) => `<li><a href="${p}">${p}</a></li>`).join("")}</ul>`;

const server = Bun.serve({
  port,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);

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

    const routes = buildRoutes(content);
    const route = routes.find((r) => r.path === normalize(pathname));

    if (!route) {
      return page(404, "404 Not Found", list(routes.map((r) => r.path)));
    }

    try {
      // ビルドと同じ関数を通す。dev だけ結果が違うということが起きない
      const html = await renderRoute(route);
      if (html === undefined) {
        // ルート自体は存在するので 404 とは区別する
        return page(501, `${route.page} は未実装`, list(routes.map((r) => r.path)));
      }
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch (error) {
      // TODO: ブラウザで読めれば十分。整形は Phase 7 のライブリロードと合わせて行う
      const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
      console.error(error);
      return page(500, "500 Internal Error", `<pre>${Bun.escapeHTML(detail)}</pre>`);
    }
  },
});

console.log(`dev server: ${server.url}`);
