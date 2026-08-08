import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(100, "Слишком длинное название"),
  description: z.string().trim().max(1000, "Слишком длинное описание"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  duration_minutes: z.coerce
    .number()
    .int("Длительность должна быть целым числом")
    .min(5, "Минимум 5 минут")
    .max(600, "Слишком долго"),
  active: z.boolean(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
