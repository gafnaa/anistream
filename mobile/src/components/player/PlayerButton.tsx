import Icon from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme';

/** Borderless player icon: a 48 dp touch target with no plate, per docs/design/screens/watch.png. */
export function PlayerButton({ icon, label, onPress, disabled = false, size = 24, filled = false }: {
  icon: string; label: string; onPress: () => void; disabled?: boolean; size?: number; filled?: boolean;
}) {
  return <Button variant="ghost" size="icon" accessibilityLabel={label} disabled={disabled}
    onPress={onPress} style={{ width: Math.max(48, size + 16), height: Math.max(48, size + 16), backgroundColor: 'transparent' }}>
    <Icon name={icon} size={size} color={colors.text} fill={filled ? colors.text : 'none'} />
  </Button>;
}
