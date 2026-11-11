import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Pressable, View, StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/Text';
import { t } from '@/i18n';

const MotionContext = createContext(true);
export function SkeletonMotionControl({ children }: PropsWithChildren) {
  const [running, setRunning] = useState(true);
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <MotionContext.Provider value={false}>{children}</MotionContext.Provider>;
  return <MotionContext.Provider value={running}>
    <Pressable accessibilityRole="button" onPress={() => setRunning(value => !value)}
      style={({ pressed }) => [styles.control, { opacity: pressed ? 0.7 : 1 }]}>
      <Text variant="caption">{t(running ? 'pause' : 'resume')}</Text>
    </Pressable>
    {children}
  </MotionContext.Provider>;
}

type BoxProps = { width?: DimensionValue; height?: DimensionValue; style?: ViewStyle };
export function SkeletonBox({ width = '100%', height = 16, style }: BoxProps) {
  const reducedMotion = useReducedMotion();
  const running = useContext(MotionContext);
  const progress = useSharedValue(0);
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    progress.value = 0;
    if (!reducedMotion && running) {
      progress.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    }
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion, running]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -boxWidth * 0.5 + progress.value * boxWidth * 1.5 }] }));
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    onLayout={event => setBoxWidth(event.nativeEvent.layout.width)} style={[styles.box, { width, height }, style]}>
    {!reducedMotion && running && <Animated.View style={[styles.sweep, { width: boxWidth * 0.5 }, sweep]}>
      <LinearGradient style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        colors={[`${colors['card-2']}00`, colors['card-2'], `${colors['card-2']}00`]} />
    </Animated.View>}
  </View>;
}
export function SkeletonText({ lines = 2, lineHeight = 16 }: { lines?: number; lineHeight?: number }) {
  return <View style={styles.text}>{Array.from({ length: lines }, (_, i) =>
    <SkeletonBox key={i} height={lineHeight} width={i === lines - 1 ? '60%' : '100%'} style={{ borderRadius: radius.chip }} />)}</View>;
}
export function PosterSkeleton({ width = 96 }: { width?: DimensionValue }) {
  return <SkeletonBox width={width} height={undefined} style={{ height: 'auto', aspectRatio: 2 / 3 }} />;
}
export function RowSkeleton({ posterWidth: fixedWidth }: { posterWidth?: number } = {}) {
  const [width, setWidth] = useState(0);
  // Three full posters and half a fourth indicate the future horizontal rail.
  const posterWidth = fixedWidth ?? Math.max(0, (width - spacing.md * 3) / 3.5);
  return <View style={styles.row} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <SkeletonBox width="44%" height={24} />
    <View style={styles.posters}>{[0, 1, 2, 3].map(i => <PosterSkeleton key={i} width={posterWidth} />)}</View>
  </View>;
}
export function HeroSkeleton({ height = 360 }: { height?: number }) {
  return <View style={[styles.hero, { height }]}>
    <SkeletonBox height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface }} />
    <View style={styles.heroText}><SkeletonText lines={2} lineHeight={32} />
      <SkeletonBox width="40%" height={16} /><SkeletonBox width="60%" height={48} /></View>
  </View>;
}
export function ListItemSkeleton() {
  return <View style={styles.list}><SkeletonBox width={112} height={63} />
    <View style={styles.listText}><SkeletonText lines={2} /></View></View>;
}
const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' },
  sweep: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  text: { gap: spacing.sm }, row: { gap: spacing.lg, overflow: 'hidden' },
  posters: { flexDirection: 'row', gap: spacing.md },
  hero: { height: 360, borderRadius: radius.card, overflow: 'hidden', justifyContent: 'flex-end' },
  heroText: { padding: spacing.xl, gap: spacing.lg },
  list: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  listText: { flex: 1, gap: spacing.sm },
  control: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors['text-muted'], borderRadius: radius.chip },
});
