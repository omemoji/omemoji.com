import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

import { sortByDate } from "@/content/query";
import { TAGS } from "@/content/tags";

export const artworkSchema = z.object({
  $schema: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  // 変換は付けない。z.toJSONSchema が変換を含むスキーマを表現できないため
  date: z.iso.date(),
  src: z.string(),
  tags: z.array(z.enum(TAGS)),
  href: z.string().optional(),
});

/** date はスキーマでは文字列だが、ドメイン型では記事と揃えて Date で持つ */
export type Artwork = { id: string; date: Date } & Omit<z.infer<typeof artworkSchema>, "date">;

export function loadArtworks(baseDir: string): Artwork[] {
  const artworks = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const raw = fs.readFileSync(path.join(baseDir, entry.name, "meta.json"), "utf-8");
      const meta = artworkSchema.parse(JSON.parse(raw));
      return { id: entry.name, ...meta, date: new Date(meta.date) };
    })
    // 日付が同じ作品の並びを確定させるため、まず id 順に整える
    .sort((a, b) => a.id.localeCompare(b.id));

  return sortByDate(artworks); // 日付の降順でソート
}
