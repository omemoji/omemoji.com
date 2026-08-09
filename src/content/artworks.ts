import * as z from "zod";

const artworkSchema = z.object({
  id: z.string(),
  src: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  href: z.string().optional(),
  description: z.string().optional(),
});

export type Artwork = z.infer<typeof artworkSchema>;
