import { View, type ViewProps } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors } from '@/theme';
import { Text } from '../Text';
export function Alert({ message, style, ...props }: ViewProps & { message: string }) {
  return <View accessibilityRole="alert" {...props} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.card }, style]}>
    <WifiOff size={24} color={colors.text} /><Text variant="caption" muted style={{ flex: 1 }}>{message}</Text>
  </View>;
}
