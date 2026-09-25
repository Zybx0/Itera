/** iOS / native: export through the share sheet, import through the Files picker. */
import { LIMITS } from '@itera/core';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { t } from '@/i18n/fr';

export async function saveTextFile(fileName: string, content: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: fileName });
  } finally {
    // Never leave a plaintext copy lying in the cache.
    if (file.exists) file.delete();
  }
}

export async function pickTextFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled) return null;
  const file = picked.result;
  if (file.size > LIMITS.importTextMax) throw new Error(t.errors.fileTooLarge);
  return file.text();
}
