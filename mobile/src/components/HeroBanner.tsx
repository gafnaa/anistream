import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { useBlockTabSwipe } from './SwipeTabScreen';
import { AppState, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type PointerEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { Extrapolation, interpolate, interpolateColor, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSeries } from '@/api';
import type { TrendingCard } from '@/api/types';
import { useIsBookmarked, toggleBookmark } from '@/storage';
import { Text } from './Text';
import { Button } from './ui/button';
import { Text as ButtonText } from './ui/text';
import { RemovalDialog } from './RemovalDialog';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function useHeroHeight() {
  return Math.round(useWindowDimensions().height * 0.605);
}

function heroImage(source: string | null) {
  if (!source) return null;
  const url = new URL(source);
  // Unsupported larger WordPress sizes fall back to a tiny image.
  if (/^i\d\.wp\.com$/.test(url.hostname)) url.searchParams.set('resize', '1333,2000');
  return url.toString();
}

function Slide({ item, index, count, width, height, offset, reducedMotion }: {
  item: TrendingCard; index: number; count: number; width: number; height: number;
  offset: SharedValue<number>; reducedMotion: boolean;
}) {
  const series = useSeries(item.slug);
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : interpolate(offset.value / width,
      [index - 1, index, index + 1], [1.06, 1.015, 1.06], Extrapolation.CLAMP) }],
  }));
  return <View style={{ width, height, overflow: 'hidden' }}>
    <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
      <Image source={heroImage(series.data?.banner ?? item.image)} contentFit="cover" contentPosition={{ top: '10%', left: '50%' }}
        priority={index === 0 ? 'high' : 'normal'} transition={0}
        accessibilityLabel={`${index + 1} / ${count}: ${item.title}`}
        style={StyleSheet.absoluteFill} />
    </Animated.View>
  </View>;
}

function Dot({ index, offset, width, reducedMotion, active }: {
  index: number; offset: SharedValue<number>; width: number; reducedMotion: boolean; active: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const progress = Math.max(0, 1 - Math.abs(offset.value / width - index));
    return {
      width: reducedMotion ? (active ? 24 : 6) : 6 + progress * 18,
      backgroundColor: reducedMotion ? (active ? colors.brand : colors['text-muted'])
        : interpolateColor(progress, [0, 1], [colors['text-muted'], colors.brand]),
    };
  });
  return <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />;
}

export function HeroBanner({ items }: { items: TrendingCard[] }) {
  const blockTabSwipe = useBlockTabSwipe();
  const titles = items.slice(0, 5);
  const { width } = useWindowDimensions();
  const height = useHeroHeight();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [delay, setDelay] = useState(5000);
  const [interaction, setInteraction] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const current = index % Math.max(1, titles.length);
  const item = titles[current];
  const series = useSeries(item?.slug ?? '');
  const saved = useIsBookmarked(item?.slug ?? '');
  const mouse = useRef<{ start: number; offset: number } | null>(null);
  const mouseOffset = useRef(0);
  const onScroll = useAnimatedScrollHandler<{ page?: number }>((event, context) => {
    offset.value = event.contentOffset.x;
    const settledPage = Math.round(event.contentOffset.x / width);
    // Web wheel/touch scrolling does not always emit a momentum-end event.
    if (Math.abs(event.contentOffset.x - settledPage * width) < 1 && context.page !== settledPage) {
      context.page = settledPage;
      runOnJS(setIndex)(settledPage);
    }
  });
  const move = useCallback((next: number, animated = true) => {
    const target = (next + titles.length) % Math.max(1, titles.length);
    scroll.current?.scrollTo({ x: target * width, animated: animated && !reducedMotion });
    setIndex(target);
  }, [titles.length, width, reducedMotion]);
  const release = useCallback(() => {
    setTouched(false);
    setDelay(3000);
    setInteraction(value => value + 1);
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (touched || dragging || paused || reducedMotion || !focused || !active || confirmRemoval || titles.length < 2) return;
    const timer = setTimeout(() => {
      move(current + 1);
      setDelay(5000);
    }, delay);
    return () => clearTimeout(timer);
  }, [touched, dragging, paused, reducedMotion, focused, active, confirmRemoval, titles.length, current, delay, interaction, move]);
  const page = useRef(current);
  useEffect(() => {
    page.current = current;
  }, [current]);
  useEffect(() => {
    scroll.current?.scrollTo({ x: page.current * width, animated: false });
  }, [width, titles.length]);

  const endMouseDrag = (event: PointerEvent) => {
    if (!mouse.current) return;
    mouse.current = null;
    const target = Math.max(0, Math.min(titles.length - 1, Math.round(mouseOffset.current / width)));
    move(target);
    release();
    const element = event.currentTarget as unknown as HTMLElement;
    if (element.hasPointerCapture?.(event.nativeEvent.pointerId)) element.releasePointerCapture(event.nativeEvent.pointerId);
  };
  if (!item) return <View style={{ height, justifyContent: 'center', padding: 24 }}><Text>{t('emptyRow')}</Text></View>;
  const episode = series.data?.episodes.reduce<(typeof series.data.episodes)[number] | undefined>((latest, candidate) => {
    if (!latest) return candidate;
    return Number(candidate.number ?? -1) > Number(latest.number ?? -1) ? candidate : latest;
  }, undefined);
  const toggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setStorageError(false);
    void toggleBookmark({ slug: item.slug, title: item.title, poster: item.image ?? '' })
      .then(() => setConfirmRemoval(false)).catch(() => setStorageError(true));
  };
  return <View style={{ height, backgroundColor: colors.surface, overflow: 'hidden' }}
    onPointerDown={() => setTouched(true)} onPointerUp={release} onPointerCancel={release}
    onTouchStart={() => { blockTabSwipe(); setTouched(true); }} onTouchEnd={release} onTouchCancel={release}>
    <Animated.ScrollView ref={scroll} horizontal pagingEnabled={Platform.OS !== 'web' || !touched} showsHorizontalScrollIndicator={false}
      testID="hero-carousel" scrollEventThrottle={16} onScroll={onScroll}
      accessibilityLabel={t('featuredCarousel')} accessibilityRole="adjustable"
      accessibilityValue={{ min: 1, max: titles.length, now: current + 1, text: item.title }}
      accessibilityActions={[{ name: 'increment', label: t('nextTitle') }, { name: 'decrement', label: t('previousTitle') }]}
      onAccessibilityAction={event => {
        move(current + (event.nativeEvent.actionName === 'increment' ? 1 : -1));
        release();
      }}
      onScrollBeginDrag={() => setDragging(true)} onScrollEndDrag={() => {
        setDragging(false);
        release();
      }}
      onMomentumScrollEnd={event => {
        setIndex(Math.max(0, Math.min(titles.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
      }}
      onPointerDown={event => {
        if (Platform.OS !== 'web' || event.nativeEvent.pointerType !== 'mouse') return;
        event.preventDefault();
        setTouched(true);
        mouse.current = { start: event.nativeEvent.pageX, offset: offset.value };
        mouseOffset.current = offset.value;
        (event.currentTarget as unknown as HTMLElement).setPointerCapture?.(event.nativeEvent.pointerId);
      }}
      onPointerMove={event => {
        if (!mouse.current) return;
        mouseOffset.current = Math.max(0, Math.min((titles.length - 1) * width,
          mouse.current.offset + mouse.current.start - event.nativeEvent.pageX));
        scroll.current?.scrollTo({ x: mouseOffset.current, animated: false });
      }}
      onPointerUp={endMouseDrag} onPointerCancel={endMouseDrag}>
      {titles.map((title, i) => <Slide key={title.slug} item={title} index={i} count={titles.length}
        width={width} height={height} offset={offset} reducedMotion={reducedMotion} />)}
    </Animated.ScrollView>
    <LinearGradient pointerEvents="none" colors={['#0B0D1299', '#0B0D1200']} style={styles.topScrim} />
    <LinearGradient pointerEvents="none" colors={['#0B0D1200', '#0B0D12F5', colors.bg]}
      locations={[0, 0.35, 1]} style={styles.bottomScrim} />
    <View pointerEvents="box-none" style={styles.content}>
      <Text variant="display" numberOfLines={2} accessibilityRole="header">{item.title}</Text>
      <Text variant="caption">{[series.data?.released, ...(series.data?.genres.slice(0, 2) ?? []), series.data && `${series.data.episodes.length} ${t('episodesLabel')}`].filter(Boolean).join('   ')}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          router.push({ pathname: episode ? '/watch/[slug]' : '/series/[slug]', params: { slug: episode?.slug ?? item.slug } });
        }}><ButtonText>{t('play')}</ButtonText></Button>
        <Button variant="secondary" onPress={() => saved ? setConfirmRemoval(true) : toggle()}>
          <ButtonText>{saved ? '✓' : '+'} {t('myList')}</ButtonText>
        </Button>
      </View>
      {storageError && <Text variant="caption" accessibilityRole="alert">{t('storageError')}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: 6 }}>
          {titles.map((title, i) => <Dot key={title.slug} index={i} offset={offset} width={width} reducedMotion={reducedMotion} active={i === current} />)}
        </View>
        {titles.length > 1 && <>
          <Button size="icon" variant="ghost" accessibilityLabel={t('previousTitle')} style={{ position: 'absolute', left: 0, bottom: -18 }} onPress={() => { move(current - 1); release(); }}><Icon name="chevron-back" size={24} color={colors['text-muted']} /></Button>
          <Button size="icon" variant="ghost" accessibilityLabel={t('nextTitle')} style={{ position: 'absolute', right: 0, bottom: -18 }} onPress={() => { move(current + 1); release(); }}><Icon name="chevron-forward" size={24} color={colors['text-muted']} /></Button>
        </>}
        {titles.length > 1 && !reducedMotion && <Button size="icon" variant="ghost" accessibilityLabel={t(paused ? 'resumeHero' : 'pauseHero')}
          style={{ position: 'absolute', right: 48, bottom: -18 }} accessibilityState={{ selected: paused }} onPress={() => setPaused(value => !value)}>
          <Icon name={paused ? 'play' : 'pause'} color={colors.text} size={24} />
        </Button>}

      </View>
    </View>
    <RemovalDialog open={confirmRemoval} onOpenChange={setConfirmRemoval} title={t('removeBookmark')}
      description={item.title} error={storageError} onRemove={toggle} />
  </View>;
}

const styles = StyleSheet.create({
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 12, gap: 16 },
});
