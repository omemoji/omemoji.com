import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

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

export type Artwork = { id: string } & z.infer<typeof artworkSchema>;

export function loadArtworks(baseDir: string): Artwork[] {
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const raw = fs.readFileSync(path.join(baseDir, entry.name, "meta.json"), "utf-8");
      return { id: entry.name, ...artworkSchema.parse(JSON.parse(raw)) };
    })
    .sort((a, b) => a.id.localeCompare(b.id)); // 作品idの昇順でソート
}
