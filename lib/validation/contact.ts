import { z } from "zod";

// Frontend/bot-side checks are not a security boundary (section 38) —
// these same schemas run again wherever the data is actually used.

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Имя должно быть не короче 2 символов")
  .max(100, "Имя слишком длинное");

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s\-()]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\+?\d{10,15}$/, "Введите номер телефона, например +7 999 123 45 67")
  );

export const MAX_COMMENT_LENGTH = 500;

export const commentSchema = z.string().trim().max(MAX_COMMENT_LENGTH, "Комментарий слишком длинный");
