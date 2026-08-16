import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

import { sortByDate } from "@/collections/query";
import { TAGS } from "@/collections/tags";

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
      const file = path.join(entry.name, "meta.json");
      const raw = fs.readFileSync(path.join(baseDir, file), "utf-8");

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch (cause) {
        // 素の SyntaxError はどの作品か示さないため、ファイルを添えて投げ直す
        throw new Error(`Invalid JSON in ${file}`, { cause });
      }

      const meta = artworkSchema.safeParse(json);
      if (!meta.success) {
        throw new Error(`Invalid meta in ${file}: ${z.prettifyError(meta.error)}`);
      }

      return { id: entry.name, ...meta.data, date: new Date(meta.data.date) };
    })
    // 日付が同じ作品の並びを確定させるため、まず id 順に整える
    .sort((a, b) => a.id.localeCompare(b.id));

  return sortByDate(artworks); // 日付の降順でソート
}
