/**
 * Dependency-free base64 / UTF-8 helpers. Hermes (React Native) does not
 * provide Buffer, so we implement base64 ourselves.
 */
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';

import { IteraError } from '../errors';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Map<string, number>([...ALPHABET].map((c, i) => [c, i]));

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + '==';
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + '=';
  }
  return out;
}

export function base64ToBytes(input: string): Uint8Array {
  if (input.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(input)) {
    throw new IteraError('VALIDATION', 'Invalid base64');
  }
  const padding = input.endsWith('==') ? 2 : input.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((input.length / 4) * 3 - padding);
  let o = 0;
  for (let i = 0; i < input.length; i += 4) {
    const a = LOOKUP.get(input[i]!) ?? 0;
    const b = LOOKUP.get(input[i + 1]!) ?? 0;
    const c = LOOKUP.get(input[i + 2]!) ?? 0;
    const d = LOOKUP.get(input[i + 3]!) ?? 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export { bytesToUtf8, utf8ToBytes };
