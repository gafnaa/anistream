import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme';

export function PlayerButton({ icon, label, onPress, disabled = false }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean;
}) {
  return <Button variant="ghost" size="icon" accessibilityLabel={label} disabled={disabled}
    onPress={onPress} style={{ backgroundColor: 'rgba(11,13,18,0.85)', borderRadius: 8 }}>
    <Ionicons name={icon} size={24} color={colors.text} />
  </Button>;
}
