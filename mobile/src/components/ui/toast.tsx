import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '../Text';
import { colors } from '@/theme';
export function Toast({ message, style, icon }: { message: string; style?: ViewStyle; icon?: ReactNode }) {
  return <View accessibilityLiveRegion="polite" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors['card-2'], borderRadius: 6, borderWidth: 1, borderColor: colors.line }, style]}>
    {icon ?? <Check size={24} color={colors.text} />}<Text variant="caption" style={{ flex: 1 }}>{message}</Text>
  </View>;
}
