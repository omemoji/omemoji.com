import fs from "node:fs";
import path from "node:path";
import * as z from "zod";
import { artworkSchema } from "@/collections/artworks";

export const generateSchema = () => z.toJSONSchema(artworkSchema);

export const outPath = path.join(import.meta.dirname, "../content/artworks/_schema.json");

// 直接実行したときだけ書く。ガードが無いと import しただけで _schema.json を上書きする
if (import.meta.main) {
  fs.writeFileSync(outPath, JSON.stringify(generateSchema(), null, 2), "utf-8");
}
