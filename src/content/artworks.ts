import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

export const artworkSchema = z.object({
  $schema: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  date: z.string(),
  src: z.string(),
  tags: z.array(z.string()),
  href: z.string().optional(),
});

export type Artwork = z.infer<typeof artworkSchema> & { id: string };

export function loadArtworks(): Artwork[] {
  const baseDir = path.join(import.meta.dirname, "../../content/artworks");

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const raw = fs.readFileSync(path.join(baseDir, entry.name, "meta.json"), "utf-8");
      return { ...artworkSchema.parse(JSON.parse(raw)), id: entry.name };
    });
}
