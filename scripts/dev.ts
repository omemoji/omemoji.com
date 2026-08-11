import fs from "node:fs";
import path from "node:path";

import { buildRoutes } from "@/routes";
import { loadContent, publicDir, renderRoute, stylesheet } from "./build";

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

/** public/ 配下と globals.css を返す。ビルドが out/ へ複製するのと同じ 2 つ */
function staticResponse(pathname: string): Response | undefined {
  if (pathname === `/${stylesheet.href}`) {
    // out/ へコピーしたものではなく原本を返すため、編集がそのまま反映される
    return new Response(Bun.file(stylesheet.file));
  }
  const file = path.join(publicDir, pathname);
  // public/ の外へ出る参照を弾く
  if (!file.startsWith(publicDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return undefined;
  }
  return new Response(Bun.file(file));
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

    const asset = staticResponse(pathname);
    if (asset) {
      return asset;
    }

    // 毎回読み直す。記事を書き換えたらリロードだけで反映される。
    // 下書きも表示する（build.ts は本番として除外する）
    const routes = buildRoutes(loadContent({ includeDrafts: true }));
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
