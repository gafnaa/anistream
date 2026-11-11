import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ArtworkBackdrop } from './ArtworkBackdrop';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';
import { useSeries } from '@/api';
import type { TrendingCard } from '@/api/types';
import { useIsBookmarked, toggleBookmark } from '@/storage';
import { Text } from './Text';
import { Chip } from './Chip';
import { ActionButton } from './ActionButton';
import { colors } from '@/theme';
import { t } from '@/i18n';

export const HERO_HEIGHT = 500;
export function HeroBanner({ items }: { items: TrendingCard[] }) {
  const titles = items.slice(0, 5);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const reducedMotion = useReducedMotion();
  const item = titles[index % Math.max(1, titles.length)];
  const series = useSeries(item?.slug ?? '');
  const saved = useIsBookmarked(item?.slug ?? '');
  useEffect(() => {
    if (touched || paused || reducedMotion || titles.length < 2) return;
    const timer = setInterval(() => setIndex(current => (current + 1) % titles.length), 8000);
    return () => clearInterval(timer);
  }, [touched, paused, reducedMotion, titles.length]);
  if (!item) return <View style={{ height: HERO_HEIGHT, justifyContent: 'center', padding: 24 }}><Text>{t('emptyRow')}</Text></View>;
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
  return <View style={styles.hero} onTouchStart={() => setTouched(true)} onTouchEnd={() => setTouched(false)} onTouchCancel={() => setTouched(false)}>
    <ArtworkBackdrop source={item.image}>
      <Image source={item.image} contentFit="contain" transition={reducedMotion ? 0 : 250}
        style={{ position: 'absolute', top: 45, right: 20, height: 300, width: 200 }} />
    </ArtworkBackdrop>
    <View style={styles.content}>
      <Text variant="display" numberOfLines={2} accessibilityRole="header">{item.title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 24 }}>
        {series.data?.genres.slice(0, 3).map(genre => <Chip key={genre} label={genre} tone="cyan" />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ActionButton primary label={`▶ ${t('play')}`} onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          router.push({ pathname: episode ? '/watch/[slug]' : '/series/[slug]', params: { slug: episode?.slug ?? item.slug } });
        }} />
        <ActionButton label={`${saved ? '✓' : '+'} ${t('myList')}`} onPress={() => {
          if (saved) setConfirmRemoval(true);
          else toggle();
        }} />
      </View>
      {storageError && <Text variant="caption">{t('storageError')}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View accessibilityLabel={`${index + 1} / ${titles.length}`} style={{ flexDirection: 'row', gap: 6 }}>
          {titles.map((title, i) => <View key={title.slug} style={{ width: i === index ? 20 : 6, height: 6,
            borderRadius: 3, backgroundColor: i === index ? colors.text : colors['text-muted'] }} />)}
        </View>
        {titles.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={t(paused ? 'resumeHero' : 'pauseHero')}
          onPress={() => setPaused(value => !value)} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Text variant="caption">{t(paused ? 'resumeHero' : 'pauseHero')}</Text>
        </Pressable>}
      </View>
    </View>
    <Modal transparent visible={confirmRemoval} animationType="fade" onRequestClose={() => setConfirmRemoval(false)}>
      <View style={{ flex: 1, backgroundColor: '#000B', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 24, gap: 16 }}>
          <Text variant="h2">{t('removeBookmark')}</Text>
          {storageError && <Text>{t('storageError')}</Text>}
          <ActionButton label={t('removeBookmark')} onPress={toggle} />
          <ActionButton label={t('cancel')} onPress={() => setConfirmRemoval(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  hero: { height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'flex-end' },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 12 },
});
