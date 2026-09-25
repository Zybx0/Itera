import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** 'regular' = frosted panel, 'clear' = lighter, more transparent glass. */
  variant?: 'regular' | 'clear';
  /** Optional colour tint (e.g. accent for primary buttons). */
  tint?: string;
  /** iOS 26 Liquid Glass reacts to touches when true. */
  interactive?: boolean;
}
