import { useMemo, useState } from 'react';
import { FlatList, PixelRatio, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { RemovalDialog } from './RemovalDialog';
import { Toggle } from './ui/toggle';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Separator } from './ui/separator';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SeriesEpisode, SeriesResponse } from '@/api/types';
import { toggleBookmark, useIsBookmarked, useSeriesProgress } from '@/storage';
import { colors, radius } from '@/theme';
import { t } from '@/i18n';
import { Text } from './Text';
import { ActionButton } from './ActionButton';
import { Chip } from './Chip';
import { ArtworkBackdrop } from './ArtworkBackdrop';
import { SkeletonBox, SkeletonText, SkeletonMotionControl } from './skeleton';

let sessionDescending = false;
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
function haptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
function timestamp(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
export function SeriesBackButton() {
  return <IconButton label={t('back')} icon="arrow-back" onPress={goBack} />;
}
function IconButton({ label, icon, onPress }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.icon, { opacity: pressed ? 0.65 : 1 }]}>
    <Ionicons name={icon} size={24} color={colors.text} />
  </Pressable>;
}
function Synopsis({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  return <View style={{ gap: 8 }}>
    <Text variant="h2" accessibilityRole="header">{t('synopsis')}</Text>
    <View>
      <Text muted numberOfLines={expanded ? undefined : 3}>{text || t('noSynopsis')}</Text>
      <Text accessible={false} aria-hidden pointerEvents="none" muted
        onLayout={event => setOverflows(event.nativeEvent.layout.height > 66 * Math.min(1.3, PixelRatio.getFontScale()) + 1)}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0, zIndex: -1 }}>{text || t('noSynopsis')}</Text>
    </View>
    {overflows && <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
      onPress={() => setExpanded(value => !value)}
      style={({ pressed }) => ({ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
      <Text variant="title">{t(expanded ? 'less' : 'more')}</Text>
    </Pressable>}
  </View>;
}
export function SeriesDetail({ series }: { series: SeriesResponse }) {
  const insets = useSafeAreaInsets();
  const saved = useIsBookmarked(series.slug);
  const { lastWatched, byEpisode } = useSeriesProgress(series.slug);
  const [descending, setDescending] = useState(sessionDescending);
  const [range, setRange] = useState<number | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const episodes = useMemo(() => [...series.episodes].sort((a, b) => {
    const left = Number(a.number);
    const right = Number(b.number);
    if (a.number !== null && b.number !== null && Number.isFinite(left) && Number.isFinite(right)) return left - right;
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  }), [series.episodes]);
  const lastIndex = episodes.findIndex(item => item.slug === lastWatched?.episodeSlug);
  const selectedRange = range ?? Math.floor(Math.max(0, lastIndex) / 50);
  const hasRanges = episodes.length >= 50;
  const visible = useMemo(() => {
    const items = hasRanges ? episodes.slice(selectedRange * 50, selectedRange * 50 + 50) : [...episodes];
    return descending ? items.reverse() : items;
  }, [episodes, selectedRange, hasRanges, descending]);
  const target = lastWatched?.episodeSlug ?? episodes[0]?.slug;
  const playLabel = lastWatched
    ? `▶ ${t('resumeEpisode')} E${lastWatched.episode} (${timestamp(lastWatched.position)})`
    : `▶ ${t('play')} E${episodes[0]?.number ?? 1}`;
  const toggle = () => {
    haptic();
    setStorageError(false);
    void toggleBookmark({ slug: series.slug, title: series.title, poster: series.image ?? '' })
      .then(() => setConfirmRemoval(false)).catch(() => setStorageError(true));
  };
  const meta = [series.status, series.type, series.released || series.season,
    `${episodes.length} ${t('episodesLabel')}`].filter(Boolean).join(' · ');
  return <View style={styles.screen}>
    <FlatList onScroll={event => setScrolled(event.nativeEvent.contentOffset.y > 24)} scrollEventThrottle={32} data={visible} keyExtractor={item => item.slug}
      initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={<View>
        <View style={{ overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}>
            <ArtworkBackdrop source={series.banner ?? series.image} />
          </View>
          <View style={{ paddingTop: insets.top + 80, paddingHorizontal: 24, gap: 16 }}>
            <Image source={series.image} contentFit="cover" accessibilityLabel={series.title}
              style={{ width: 120, height: 180, borderRadius: radius.card, backgroundColor: colors.card }} />
            <Text variant="h1" numberOfLines={3} accessibilityRole="header">{series.title}</Text>
            <Text variant="caption" muted>{meta}</Text>
            {series.rating && <Text variant="caption">{`★ ${series.rating}`}</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {/* TODO(M5): link genre chips once /genre/[slug] and genre slugs exist. */}
              {series.genres.map(genre => <Chip key={genre} label={genre} tone="cyan" />)}
            </View>
          </View>
        </View>
        <View style={{ padding: 24, gap: 12 }}>
          {target && <ActionButton primary label={playLabel} onPress={() => {
            haptic();
            router.push({ pathname: '/watch/[slug]', params: { slug: target } });
          }} />}
          <ActionButton label={`${saved ? '✓' : '+'} ${t(saved ? 'inMyList' : 'myList')}`}
            onPress={() => saved ? setConfirmRemoval(true) : toggle()} />
          {storageError && <Text accessibilityRole="alert">{t('storageError')}</Text>}
          {shareError && <Text accessibilityRole="alert">{t('shareError')}</Text>}
          <View style={{ marginTop: 12 }}><Synopsis text={series.synopsis} /></View>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text variant="h2" accessibilityRole="header">{t('episodesHeading')}</Text>
            <Toggle pressed={descending} onPressedChange={value => {
              sessionDescending = value;
              setDescending(value);
            }} accessibilityLabel={t(descending ? 'descending' : 'ascending')}>
              <Text variant="caption">{t(descending ? 'descending' : 'ascending')}</Text>
            </Toggle>
          </View>
          {hasRanges && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <ToggleGroup type="single" value={String(selectedRange)} onValueChange={value => {
              if (value) setRange(Number(value));
            }} className="gap-2">
            {Array.from({ length: Math.ceil(episodes.length / 50) }, (_, index) => <ToggleGroupItem key={index}
              value={String(index)} className="rounded-sm px-3">
              <Text variant="caption" tabular>{rangeLabel(episodes, index)}</Text>
            </ToggleGroupItem>)}
            </ToggleGroup>
          </ScrollView>}
        </View>
      </View>}
      ListEmptyComponent={<View style={{ padding: 24, gap: 16 }}>
        <Text muted>{t('noEpisodes')}</Text><ActionButton label={t('backHome')} onPress={() => router.replace('/')} />
      </View>}
      renderItem={({ item }) => {
        const progress = byEpisode.get(item.slug)?.progress ?? 0;
        const watched = progress >= 0.9;
        return <Pressable accessibilityRole="button"
          accessibilityLabel={`${t('episodeLabel')} ${item.number ?? ''}, ${item.title}${progress > 0 ? `, ${t(watched ? 'watched' : 'inProgress')}` : ''}`}
          onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug: item.slug } })}
          style={({ pressed }) => ({ marginHorizontal: 24, paddingVertical: 16, gap: 8,
            opacity: pressed ? 0.65 : 1 })}>
          <Separator />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, minHeight: 48, borderRadius: radius.chip, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }}>
              <Text variant="title" tabular>{item.number ?? '▶'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="title" muted={watched}>{episodeDisplayTitle(item.title, series.title)}</Text>
              {!!item.date && <Text variant="caption" muted>{item.date}</Text>}
              {progress > 0 && <Text variant="caption">{watched ? '✓ ' : ''}{t(watched ? 'watched' : 'inProgress')}</Text>}
            </View>
            <Ionicons name={watched ? 'checkmark-circle-outline' : 'play-circle-outline'} size={24} color={colors.text} />
          </View>
          {progress > 0 && !watched && <View accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            style={{ height: 4, backgroundColor: colors.line, borderRadius: 2 }}>
            <View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: colors.brand, borderRadius: 2 }} />
          </View>}
        </Pressable>;
      }} />
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16, zIndex: 10, backgroundColor: scrolled ? colors.bg : 'transparent', flexDirection: 'row', justifyContent: 'space-between' }}>
      <SeriesBackButton />
      <IconButton label={t('share')} icon="share-outline" onPress={() => {
        setShareError(false);
        void Share.share({ message: `anistream://series/${series.slug}` }).catch(() => setShareError(true));
      }} />
    </View>
    <RemovalDialog open={confirmRemoval} onOpenChange={setConfirmRemoval} title={t('removeBookmark')}
      description={series.title} error={storageError} onRemove={toggle} />
  </View>;
}
export function SeriesSkeleton() {
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { paddingTop: insets.top + 80, paddingHorizontal: 24 }]}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><SkeletonBox height={400} style={{ backgroundColor: colors.surface, borderRadius: 0 }} /></View>
    <View style={{ position: 'relative' }}><SkeletonMotionControl floatingControl>
      <View style={{ gap: 16 }}>
        <SkeletonBox width={120} height={180} />
        <SkeletonText lines={2} lineHeight={30} />
        <SkeletonBox width="80%" /><SkeletonBox width="55%" height={24} />
        <SkeletonBox height={48} /><SkeletonBox height={48} />
        <SkeletonText lines={3} />
        <SkeletonBox height={80} /><SkeletonBox height={80} />
      </View>
    </SkeletonMotionControl></View>
    <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}><SeriesBackButton /></View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  icon: { width: 48, height: 48, borderRadius: radius.card, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center' },
});

/** Range chips use real episode numbers (e.g. 1086–1135), not list positions. */
function rangeLabel(episodes: SeriesEpisode[], index: number) {
  const first = episodes[index * 50];
  const last = episodes[Math.min(episodes.length, (index + 1) * 50) - 1];
  const from = first?.number ?? String(index * 50 + 1);
  const to = last?.number ?? String(Math.min(episodes.length, (index + 1) * 50));
  return `${from}–${to}`;
}

/** "One Piece Episode 1086 Subtitle Indonesia" → "Episode 1086". */
function episodeDisplayTitle(title: string, seriesTitle: string) {
  let cleaned = title.replace(/\s*subtitle indonesia\s*$/i, '').trim();
  if (cleaned.toLowerCase().startsWith(seriesTitle.toLowerCase())) {
    cleaned = cleaned.slice(seriesTitle.length).trim();
  }
  return cleaned || title;
}
