/**
 * Text normalisation for user-provided content.
 *
 * Itera renders card fields as plain text (never as HTML), which removes the
 * whole class of XSS / HTML-injection issues Anki has to deal with. We still
 * strip control characters (except tab/newline) and Unicode bidi overrides,
 * which can be used to visually spoof content ("Trojan Source").
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BIDI_OVERRIDES = /[‪-‮⁦-⁩]/g;

export function cleanText(input: string): string {
  return input.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').replace(BIDI_OVERRIDES, '').normalize('NFC');
}

export function cleanSingleLine(input: string): string {
  return cleanText(input).replace(/\s+/g, ' ').trim();
}

export function cleanTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = cleanSingleLine(raw).replace(/\s/g, '_').toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
}
