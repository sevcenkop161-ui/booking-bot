import { z } from "zod";

export const artistSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(100, "Слишком длинное имя"),
  specialization: z.string().trim().max(100, "Слишком длинная специализация"),
  bio: z.string().trim().max(1000, "Слишком длинное описание"),
  image_url: z.string().trim().max(500, "Слишком длинная ссылка"),
  active: z.boolean(),
  // Not .uuid(): these values only ever come from our own checkbox list
  // (never typed by a user), and some of our seed data uses
  // hand-crafted IDs that aren't RFC-4122-shaped. The real guarantee
  // against nonsense values is the foreign key on artist_services, not
  // this format check.
  service_ids: z.array(z.string().min(1)),
});

export type ArtistInput = z.infer<typeof artistSchema>;
