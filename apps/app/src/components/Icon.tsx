import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Text } from 'react-native';

/** SF Symbols on iOS; a text glyph elsewhere (web, Android, desktop). */
const ICONS = {
  back: ['chevron.left', '‹'],
  add: ['plus', '+'],
  settings: ['gearshape.fill', '⚙'],
  close: ['xmark', '✕'],
  undo: ['arrow.uturn.backward', '↶'],
  lock: ['lock.fill', '🔒'],
  sliders: ['slider.horizontal.3', '☰'],
  chevron: ['chevron.right', '›'],
  sparkles: ['sparkles', '✦'],
} as const satisfies Record<string, readonly [SFSymbol, string]>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const [symbol, glyph] = ICONS[name];
  return (
    <SymbolView
      name={symbol}
      size={size}
      tintColor={color}
      fallback={<Text style={{ fontSize: size, lineHeight: size * 1.15, color, fontWeight: '600' }}>{glyph}</Text>}
    />
  );
}
