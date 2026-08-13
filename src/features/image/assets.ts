import fs from "node:fs";
import path from "node:path";
import type { Root } from "hast";
import { visit } from "unist-util-visit";

/** 画像を置く名前空間。HTML と同じ階層には置かない */
const ROOT = "images";

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"];

export type ImageKind = "articles" | "artworks";

/** 複製元のディレクトリと、それが属するコンテンツ */
export type ImageSource = { kind: ImageKind; id: string; dir: string };

/**
 * 複製元の絶対パスと、出力先ディレクトリからの相対パス、そして配信 URL。
 *
 * url は最適化のマニフェストのキーになる。ここで `imageUrl` から起こしておくことで、
 * ページ側が組み立てる URL と必ず同じ文字列になる（エンコードのずれが起きない）。
 */
export type ImageAsset = { from: string; to: string; url: string };

/**
 * 画像を参照するときの基点 URL。
 *
 * ルート絶対にすることで、参照元が一覧（`/articles`）でもタグ別（`/articles/tag/Linux`）でも
 * 詳細（`/articles/void_linux`）でも同じ文字列が通る。相対パスだと URL の深さで解決先が変わる。
 *
 * さらに id で区切ることで、記事をまたいだ同名画像が衝突しない
 * （実際に fastfetch.png が 2 記事にある）。
 */
export const imageBase = (kind: ImageKind, id: string): string =>
  `/${ROOT}/${kind}/${encodeURIComponent(id)}`;

/** 出力先での配置。imageBase と対になる */
export const imageDir = (kind: ImageKind, id: string): string => path.join(ROOT, kind, id);

/** 1 枚の画像を指す URL。meta.json の src のように、ファイル名が分かっている場合に使う */
export const imageUrl = (kind: ImageKind, id: string, file: string): string =>
  `${imageBase(kind, id)}/${encodeURIComponent(file)}`;

export const isImage = (file: string): boolean =>
  EXTENSIONS.includes(path.extname(file).toLowerCase());

/** コンテンツのディレクトリを走査して、複製すべき画像を集める */
export function collectImages(sources: ImageSource[]): ImageAsset[] {
  return sources.flatMap(({ kind, id, dir }) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isImage(entry.name))
      .map((entry) => ({
        from: path.join(dir, entry.name),
        to: path.join(imageDir(kind, id), entry.name),
        url: imageUrl(kind, id, entry.name),
      }))
  );
}

/** すでに絶対 URL・ルート絶対・data: のものは触らない */
const isAbsolute = (src: string): boolean => /^([a-z]+:|\/\/|\/)/i.test(src);

/**
 * 本文中の画像参照を配信 URL へ書き換える。
 *
 * Markdown は記事ディレクトリからの相対（`![alt](fastfetch.png)`）で書かれているため、
 * そのままでは出力先の階層と対応しない。
 */
export function rewriteImageUrls(tree: Root, base: string): Root {
  visit(tree, "element", (node) => {
    if (node.tagName !== "img") return;

    const { src } = node.properties;
    if (typeof src !== "string" || isAbsolute(src)) return;

    // ./foo.png や ../foo.png のような書き方も受ける。
    // hast の properties はインデックスシグネチャなので、代入は Object.assign で行う
    Object.assign(node.properties, {
      src: `${base}/${encodeURIComponent(path.basename(src))}`,
    });
  });

  return tree;
}
