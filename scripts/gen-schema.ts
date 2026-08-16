import fs from "node:fs";
import path from "node:path";
import * as z from "zod";
import { artworkSchema } from "@/collections/artworks";

export const generateSchema = () => z.toJSONSchema(artworkSchema);

const outPath = path.join(import.meta.dirname, "../content/artworks/_schema.json");

fs.writeFileSync(outPath, JSON.stringify(generateSchema(), null, 2), "utf-8");
