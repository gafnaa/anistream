import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { colors, typography, type TextVariant } from '@/theme';

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
  muted?: boolean;
  tabular?: boolean;
};

export function Text({ variant = 'body', muted = false, tabular = false, style, numberOfLines, ...props }: TextProps) {
  return <NativeText {...props} numberOfLines={numberOfLines ?? (variant === 'title' ? 2 : undefined)}
    ellipsizeMode="tail" allowFontScaling maxFontSizeMultiplier={1.3}
    style={[typography[variant], { color: muted ? colors['text-muted'] : colors.text },
      tabular && { fontVariant: ['tabular-nums'] }, style]} />;
}
