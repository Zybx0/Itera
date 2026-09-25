import type { z } from 'zod';

import { IteraError } from './errors';

/** Parse with a zod schema, converting failures into IteraError('VALIDATION') without echoing user data. */
export function validate<S extends z.ZodType>(schema: S, value: unknown, what: string): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((i) => i.path.join('.') || '(root)'))].slice(0, 5);
    throw new IteraError('VALIDATION', `Invalid ${what}: ${fields.join(', ')}`);
  }
  return result.data;
}
