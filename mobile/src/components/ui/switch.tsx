import { Switch as NativeSwitch, type SwitchProps } from 'react-native';
import { colors } from '@/theme';
export function Switch(props: SwitchProps) {
  return <NativeSwitch trackColor={{ false: colors.line, true: colors['brand-strong'] }}
    thumbColor={colors.text} ios_backgroundColor={colors.line} hitSlop={12} {...props} />;
}
