/**
 * Design tokens. Every colour used by the UI comes from here so light/dark
 * themes stay consistent. "glass*" tokens are the translucent layers drawn
 * over the animated background.
 */
export interface Theme {
  dark: boolean;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentText: string;
  danger: string;
  glassFill: string;
  glassFillStrong: string;
  glassBorder: string;
  glassHighlight: string;
  shadow: string;
  /** Plain, static two-stop gradient — no decorative shapes. */
  backgroundGradient: [string, string];
  rating: { again: string; hard: string; good: string; easy: string };
  state: { new: string; learning: string; review: string };
}

export const lightTheme: Theme = {
  dark: false,
  text: '#17141F',
  textSecondary: 'rgba(23,20,31,0.62)',
  textTertiary: 'rgba(23,20,31,0.40)',
  accent: '#6A50C9',
  accentText: '#FFFFFF',
  danger: '#C4454C',
  glassFill: 'rgba(255,255,255,0.5)',
  glassFillStrong: 'rgba(255,255,255,0.74)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassHighlight: 'rgba(255,255,255,0.85)',
  shadow: 'rgba(20,14,36,0.14)',
  backgroundGradient: ['#FAF9FC', '#F0EDF4'],
  rating: { again: '#C4454C', hard: '#B5732E', good: '#2E8F63', easy: '#3E62B5' },
  state: { new: '#3E62B5', learning: '#C4454C', review: '#2E8F63' },
};

/**
 * Primary look of the app: near-black with a dark, muted violet undertone —
 * deliberately sober, not the bright/rainbow gradient of an earlier pass.
 */
export const darkTheme: Theme = {
  dark: true,
  text: '#EDEAF3',
  textSecondary: 'rgba(237,234,243,0.62)',
  textTertiary: 'rgba(237,234,243,0.38)',
  accent: '#7A5FD1',
  accentText: '#F5F3FF',
  danger: '#D9666C',
  glassFill: 'rgba(180,165,210,0.06)',
  glassFillStrong: 'rgba(180,165,210,0.12)',
  glassBorder: 'rgba(210,200,230,0.12)',
  glassHighlight: 'rgba(220,210,240,0.2)',
  shadow: 'rgba(0,0,0,0.55)',
  backgroundGradient: ['#0A0710', '#030204'],
  rating: { again: '#D9666C', hard: '#C98A54', good: '#4EA37C', easy: '#6D89CE' },
  state: { new: '#6D89CE', learning: '#D9666C', review: '#4EA37C' },
};

export const radius = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const MAX_CONTENT_WIDTH = 720;

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  callout: { fontSize: 15, fontWeight: '500' },
  caption: { fontSize: 13, fontWeight: '500' },
  card: { fontSize: 26, fontWeight: '600', lineHeight: 34 },
} as const;
