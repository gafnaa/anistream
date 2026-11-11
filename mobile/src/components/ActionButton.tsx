import { Button, type ButtonProps } from './ui/button';
import { Text } from './ui/text';

export function ActionButton({ label, onPress, primary = false, variant }: {
  label: string; onPress: () => void; primary?: boolean; variant?: ButtonProps['variant'];
}) {
  return <Button accessibilityLabel={label} onPress={onPress} variant={variant ?? (primary ? 'default' : 'secondary')}>
    <Text>{label}</Text>
  </Button>;
}
