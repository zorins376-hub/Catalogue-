import type { z } from 'zod';
import { unprocessable } from './errors.js';

/**
 * Parse a value against a zod schema, throwing a 422 HttpError on failure.
 * Returns z.output<S> so schema defaults are applied (fields with .default()
 * are non-optional in the result), matching the DB-layer input types.
 */
export function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw unprocessable('Validation failed', result.error.flatten());
  }
  return result.data;
}
