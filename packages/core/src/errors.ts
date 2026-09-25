/**
 * Single error type thrown by @itera/core. `code` is stable and safe to show
 * or log; `message` never contains user content or key material.
 */
export type IteraErrorCode =
  | 'VALIDATION' // input or stored data does not match the schema / limits
  | 'NOT_FOUND' // referenced entity does not exist
  | 'CRYPTO' // decryption / authentication failure, missing CSPRNG
  | 'IMPORT_FORMAT' // export file is malformed, wrong version or wrong passphrase
  | 'CONFLICT'; // operation not allowed in the current state

export class IteraError extends Error {
  readonly code: IteraErrorCode;

  constructor(code: IteraErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'IteraError';
    this.code = code;
  }
}

export function isIteraError(value: unknown, code?: IteraErrorCode): value is IteraError {
  return value instanceof IteraError && (code === undefined || value.code === code);
}
