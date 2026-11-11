import type { TextStyle } from 'react-native';
import { brandRamp } from './palette';
export { brandRamp, tones, gradients, genreGradients } from './palette';

export const colors = {
  ...brandRamp, elevated: '#242630', overlay: '#2C2F3A', glass: 'rgba(19,21,28,0.92)',
  bg: '#0B0D12', surface: '#13151C', card: '#1A1C24', 'card-2': '#23262F',
  line: '#2E323D', text: '#EEF1F7', 'text-muted': '#9299AD', brand: '#F43F5E',
  'brand-strong': '#E11D48', 'brand-2': '#FB923C', accent: '#FDA4AF',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { chip: 6, card: 10, sheet: 14 } as const;
export const fonts = {
  jakarta600: 'PlusJakartaSans_600SemiBold', jakarta700: 'PlusJakartaSans_700Bold',
  jakarta800: 'PlusJakartaSans_800ExtraBold', inter400: 'Inter_400Regular',
  inter500: 'Inter_500Medium', inter600: 'Inter_600SemiBold',
} as const;
export const typography = {
  display: { fontFamily: fonts.jakarta800, fontSize: 32, lineHeight: 38 },
  h1: { fontFamily: fonts.jakarta700, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: fonts.jakarta700, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fonts.inter600, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.inter400, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.inter500, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.inter600, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;
export type TextVariant = keyof typeof typography;
export type ColorToken = keyof typeof colors;
