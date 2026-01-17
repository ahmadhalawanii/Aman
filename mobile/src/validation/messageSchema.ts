import { z } from "zod";

export const MIN_CHARS = 10;
export const MAX_CHARS = 1200;

export const messageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(MIN_CHARS, `Paste at least ${MIN_CHARS} characters.`)
    .max(MAX_CHARS, `Message is too long (max ${MAX_CHARS} characters).`),
});