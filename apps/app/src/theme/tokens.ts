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
  backgroundGradient: [string, string, string];
  orbs: [string, string, string];
  rating: { again: string; hard: string; good: string; easy: string };
  state: { new: string; learning: string; review: string };
}

export const lightTheme: Theme = {
  dark: false,
  text: '#0E1024',
  textSecondary: 'rgba(14,16,36,0.66)',
  textTertiary: 'rgba(14,16,36,0.42)',
  accent: '#5B4BFF',
  accentText: '#FFFFFF',
  danger: '#E5484D',
  glassFill: 'rgba(255,255,255,0.46)',
  glassFillStrong: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.75)',
  glassHighlight: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(31,26,92,0.18)',
  backgroundGradient: ['#E9E7FF', '#F6EEFF', '#E3F4FF'],
  orbs: ['#8E7CFF', '#FF8FCB', '#56CCF2'],
  rating: { again: '#E5484D', hard: '#F2994A', good: '#30A46C', easy: '#3E7BFA' },
  state: { new: '#3E7BFA', learning: '#E5484D', review: '#30A46C' },
};

export const darkTheme: Theme = {
  dark: true,
  text: '#F4F4FF',
  textSecondary: 'rgba(244,244,255,0.7)',
  textTertiary: 'rgba(244,244,255,0.45)',
  accent: '#8C7DFF',
  accentText: '#FFFFFF',
  danger: '#FF6369',
  glassFill: 'rgba(255,255,255,0.08)',
  glassFillStrong: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassHighlight: 'rgba(255,255,255,0.28)',
  shadow: 'rgba(0,0,0,0.45)',
  backgroundGradient: ['#07071A', '#120B2E', '#051A2B'],
  orbs: ['#5B4BFF', '#C0369B', '#1485B8'],
  rating: { again: '#FF6369', hard: '#FFA057', good: '#3DD68C', easy: '#70A1FF' },
  state: { new: '#70A1FF', learning: '#FF6369', review: '#3DD68C' },
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
