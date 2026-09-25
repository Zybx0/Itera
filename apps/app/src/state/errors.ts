import { isIteraError } from '@itera/core';

import { t } from '@/i18n/fr';

/** User-facing message for any thrown value. Never displays raw internals. */
export function errorMessage(error: unknown): string {
  if (isIteraError(error)) return t.errors[error.code];
  if (error instanceof Error && error.message === t.errors.fileTooLarge) return error.message;
  return t.errors.generic;
}
