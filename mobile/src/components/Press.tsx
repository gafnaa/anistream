import { useState } from 'react';
import { Pressable, type PressableProps, type PressableStateCallbackType } from 'react-native';

/**
 * Pressable that resolves a `({ pressed }) => style` callback itself and hands
 * Pressable a static style. NativeWind's Pressable interop drops callback
 * styles on Android (layout such as width/flex was silently lost there while
 * web looked fine), so use this instead of a style callback on Pressable.
 */
export function Press({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  return <Pressable {...props}
    onPressIn={event => { setPressed(true); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); onPressOut?.(event); }}
    style={typeof style === 'function' ? style({ pressed } as PressableStateCallbackType) : style} />;
}
