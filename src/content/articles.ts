import * as z from "zod";

const articleSchema = z.object({
  emoji: z.string(),
  title: z.string(),
  description: z.string(),
  date: z.date(),
  tags: z.array(z.string()),
  published: z.boolean(),
});

export type Article = z.infer<typeof articleSchema>;
