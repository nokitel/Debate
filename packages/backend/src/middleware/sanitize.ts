import { middleware } from "../trpc/base.js";

/**
 * Strips HTML tags from all string values in the input.
 * Applied to mutation procedures to prevent stored XSS.
 */
export const sanitizeMiddleware = middleware(async ({ getRawInput, next }) => {
  const rawInput = await getRawInput();
  if (rawInput && typeof rawInput === "object") {
    sanitizeObject(rawInput as Record<string, unknown>);
  }
  return next();
});

/** Recursively strip HTML tags from string values in an object. */
function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string") {
      obj[key] = stripHtmlTags(value);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === "string") {
          value[i] = stripHtmlTags(value[i] as string);
        } else if (value[i] && typeof value[i] === "object") {
          sanitizeObject(value[i] as Record<string, unknown>);
        }
      }
    } else if (value && typeof value === "object") {
      sanitizeObject(value as Record<string, unknown>);
    }
  }
}

/** Remove HTML tags from a string. */
function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}
