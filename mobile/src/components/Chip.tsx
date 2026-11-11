import { View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, tones } from '@/theme';

type Props = { label: string; tone: keyof typeof tones; solid?: boolean };
export function Chip({ label, tone, solid = false }: Props) {
  const color = tones[tone];
  return <View style={{ alignSelf: 'flex-start', borderRadius: radius.chip,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: solid ? color.solid : color.subtle }}>
    <Text variant="caption" style={{ color: solid ? colors.bg : colors.text }}>{label}</Text>
  </View>;
}
export function Badge(props: Omit<Props, 'solid'>) { return <Chip {...props} solid />; }
