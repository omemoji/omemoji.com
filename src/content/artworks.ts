import * as z from "zod";

const artworkSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.string(),
  src: z.string(),
  tags: z.array(z.string()),
  href: z.string().optional(),
});

export type Artwork = z.infer<typeof artworkSchema>;
