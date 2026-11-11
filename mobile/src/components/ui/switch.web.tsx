import { createElement, useState } from 'react';
import { View, type SwitchProps } from 'react-native';
import { colors } from '@/theme';
export function Switch({ value, onValueChange, disabled, accessibilityLabel }: SwitchProps) {
  const [focused, setFocused] = useState(false);
  return <View style={{ width: 48, height: 48, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
    <View style={{ width: 48, height: 28, borderRadius: 14, padding: 3, alignItems: value ? 'flex-end' : 'flex-start', backgroundColor: value ? colors['brand-strong'] : colors.line,
      outlineStyle: focused ? 'solid' : undefined, outlineWidth: 2, outlineColor: colors.brand, outlineOffset: 3 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text }} />
    </View>
    {createElement('input', { type: 'checkbox', role: 'switch', 'aria-label': accessibilityLabel, checked: !!value, disabled,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onValueChange?.(event.target.checked),
      onFocus: () => setFocused(true), onBlur: () => setFocused(false),
      style: { position: 'absolute', inset: 0, width: 48, height: 48, margin: 0, opacity: 0, cursor: disabled ? 'default' : 'pointer' } })}
  </View>;
}
