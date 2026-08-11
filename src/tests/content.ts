import path from "node:path";

import { loadAbout } from "@/content/about";
import { loadArticles } from "@/content/articles";
import { loadArtworks } from "@/content/artworks";

/**
 * 実データを読み込むテスト用のフィクスチャ。
 *
 * bun はテストファイル間でモジュールを 1 度しか評価しないため、
 * ここを経由すれば実行全体で 1 回の走査に収まる。
 * 各テストファイルが直接 loadArticles を呼ぶと、その数だけ走査が走る。
 */
export const articlesDir = path.join(import.meta.dirname, "../../content/articles");
export const artworksDir = path.join(import.meta.dirname, "../../content/artworks");

export const aboutDir = path.join(import.meta.dirname, "../../content/about");

export const articles = loadArticles(articlesDir);
export const artworks = loadArtworks(artworksDir);
export const about = loadAbout(aboutDir);
