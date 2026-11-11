import { Badge as ReusableBadge } from './ui/badge';
import { Text } from './Text';
import { colors, radius, spacing, tones } from '@/theme';

type Props = { label: string; tone: keyof typeof tones; solid?: boolean };
export function Chip({ label, tone, solid = false }: Props) {
  const color = tones[tone];
  return <ReusableBadge variant="secondary" style={{ alignSelf: 'flex-start', borderRadius: radius.chip,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: solid ? color.solid : color.subtle }}>
    <Text variant="label" style={{ textTransform: 'none', color: solid ? colors.bg : color.solid }}>{label}</Text>
  </ReusableBadge>;
}
export function Badge(props: Omit<Props, 'solid'>) { return <Chip {...props} solid />; }
