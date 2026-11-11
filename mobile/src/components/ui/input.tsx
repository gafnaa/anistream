import { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { colors, fonts } from '@/theme';
export function Input({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return <TextInput placeholderTextColor={colors['text-muted']} {...props}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[{ height: 48, paddingHorizontal: 16, borderRadius: 6, borderWidth: focused ? 2 : 1,
      borderColor: focused ? colors.brand : colors.line, backgroundColor: colors.card,
      color: colors.text, fontFamily: fonts.inter400, fontSize: 15 }, style]} />;
}
