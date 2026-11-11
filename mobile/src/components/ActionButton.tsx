import { Pressable } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '@/theme';

export function ActionButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 20, paddingVertical: 12,
      borderRadius: radius.chip, backgroundColor: primary ? colors['brand-strong'] : colors['card-2'],
      justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
    <Text variant="title">{label}</Text>
  </Pressable>;
}
