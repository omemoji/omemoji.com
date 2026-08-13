import fs from "node:fs";
import path from "node:path";

import { outDir } from "./build";

// dev サーバ（3000）と同時に立ち上げられるよう別の番号にする
const { PREVIEW_PORT } = process.env;
const port = Number(PREVIEW_PORT ?? 4000);

/**
 * ビルド済みの `out/` をそのまま配信する。**dev サーバではなく本番の出力を見るためのもの。**
 *
 * リンクは拡張子なし（`/articles/2`）で、`.html` を補うのは Cloudflare Pages の仕事である。
 * 素の静的サーバでは全て 404 になるため、その解決だけをここで真似る。
 */
function resolve(pathname: string): string | undefined {
  const clean = pathname.replace(/\/+$/, "");
  const candidates = [
    path.join(outDir, clean),
    // Pages と同じ順序。`/articles` はファイルとディレクトリの両方があり得る
    path.join(outDir, `${clean}.html`),
    path.join(outDir, clean, "index.html"),
  ];

  return candidates.find(
    // 出力先の外へ出る参照を弾く
    (file) => file.startsWith(outDir) && fs.existsSync(file) && fs.statSync(file).isFile()
  );
}

if (!fs.existsSync(outDir)) {
  console.error(`${path.relative(process.cwd(), outDir)}/ がない。先に bun run build を実行する`);
  process.exit(1);
}

const server = Bun.serve({
  port,
  fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const file = resolve(pathname);

    if (file) {
      return new Response(Bun.file(file));
    }

    // 見つからなければ 404 ページを返す。Pages の挙動に合わせる
    const notFound = path.join(outDir, "404.html");
    return fs.existsSync(notFound)
      ? new Response(Bun.file(notFound), { status: 404 })
      : new Response("404 Not Found", { status: 404 });
  },
});

console.log(`preview ${path.relative(process.cwd(), outDir)}/: ${server.url}`);
