import { createContext, useContext, useEffect, useState, type RefObject, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export const TabBlurTarget = createContext<Record<string, RefObject<ComponentRef<typeof View> | null>>>({});
export const TAB_BAR_HEIGHT = 60;
export function useTabBarInset() { return TAB_BAR_HEIGHT + useSafeAreaInsets().bottom + 28; }

export function GlassTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const [edge, setEdge] = useState(16);
  const [focusedTab, setFocusedTab] = useState<string | null>(null);
  const targets = useContext(TabBlurTarget);
  const target = targets[state.routes[state.index].name];
  const [width, setWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(state.index);
  useEffect(() => {
    position.value = withTiming(state.index, { duration: reduceMotion ? 0 : 230, easing: Easing.out(Easing.cubic) });
  }, [state.index, position, reduceMotion]);
  const cell = (width - 18 + 8) / state.routes.length;
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * cell }] }));
  const liquid = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  return <View pointerEvents="box-none"
    onLayout={event => setEdge(Math.min(16, Math.max(8, (event.nativeEvent.layout.width + edge * 2 - 290) / 2)))}
    style={[styles.position, { bottom: bottom + 12, left: edge, right: edge }]}>
    <View style={styles.shadow}>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.bar}>
        {liquid ? <GlassView colorScheme="dark" tintColor={colors.surface} style={StyleSheet.absoluteFill} />
          : <BlurView tint="dark" intensity={65} blurTarget={target}
            blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
        {width > 0 && <Animated.View pointerEvents="none" style={[styles.indicator, { width: cell - 8 }, indicator]} />}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} aria-selected={focused}
            onFocus={() => setFocusedTab(route.key)} onBlur={() => setFocusedTab(null)}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.65 : 1 },
              Platform.OS === 'web' && focusedTab === route.key && {
                outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.brand,
              }]}>
            {options.tabBarIcon?.({ focused, color: focused ? colors.brand : colors['text-muted'], size: 24 })}
          </Pressable>;
        })}
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  position: { position: 'absolute', left: 16, right: 16 },
  shadow: { borderRadius: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.32)' },
  bar: { height: TAB_BAR_HEIGHT, borderRadius: 32, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', gap: 8, paddingHorizontal: 8, alignItems: 'center' },
  tab: { flex: 1, minWidth: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  indicator: { position: 'absolute', left: 12, top: 7, height: 44, borderRadius: 22,
    backgroundColor: '#F43F5E26', boxShadow: '0 0 14px rgba(244,63,94,0.18)' },
});
