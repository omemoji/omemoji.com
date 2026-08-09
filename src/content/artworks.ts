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

export type Artwork = z.infer<typeof artworkSchema>;
