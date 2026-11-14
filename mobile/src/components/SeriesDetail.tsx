import { DownloadButton } from './DownloadButton';
import { Press } from '@/components/Press';
import { BrowseNavigation } from '@/components/BrowseNavigation';
import { useMemo, useState } from 'react';
import { FlatList, PixelRatio, ScrollView, Share, StyleSheet, View } from 'react-native';
import { RemovalDialog } from './RemovalDialog';
import { Toggle } from './ui/toggle';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { EpisodeRow } from './EpisodeRow';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Icon from '@/components/Icon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SeriesEpisode, SeriesResponse } from '@/api/types';
import { toggleBookmark, useIsBookmarked, useSeriesProgress } from '@/storage';
import { colors, radius } from '@/theme';
import { t } from '@/i18n';
import { Text } from './Text';
import { ActionButton } from './ActionButton';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientBackground } from './AmbientBackground';
import { SkeletonBox, SkeletonText, SkeletonMotionControl } from './skeleton';
import { useBrowse } from '@/api';
import { Row } from './Row';
import { PosterCard } from './PosterCard';
import { Button } from './ui/button';

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
  label: string; icon: string; onPress: () => void;
}) {
  return <Press accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.icon, { opacity: pressed ? 0.65 : 1 }]}>
    <Icon name={icon} size={24} color={colors.text} />
  </Press>;
}
function Synopsis({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  return <View style={{ gap: 8 }}>
    <View>
      <Text muted numberOfLines={expanded ? undefined : 3}>{text || t('noSynopsis')}</Text>
      <Text accessible={false} aria-hidden pointerEvents="none" muted
        onLayout={event => setOverflows(event.nativeEvent.layout.height > 66 * Math.min(1.3, PixelRatio.getFontScale()) + 1)}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0, zIndex: -1 }}>{text || t('noSynopsis')}</Text>
    </View>
    {overflows && <Press accessibilityRole="button" accessibilityState={{ expanded }}
      onPress={() => setExpanded(value => !value)}
      style={({ pressed }) => ({ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
      <Text variant="title">{t(expanded ? 'less' : 'more')}</Text>
    </Press>}
  </View>;
}
export function SeriesDetail({ series }: { series: SeriesResponse }) {
  const genre = series.genreLinks?.[0]?.slug;
  const related = useBrowse({ genre }, !!genre);
  const insets = useSafeAreaInsets();
  const saved = useIsBookmarked(series.slug);
  const { lastWatched } = useSeriesProgress(series.slug);
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
  // A film is stored as a single episode, so its labels drop the episode number and count.
  const isMovie = series.slug.startsWith('tm~movie~');
  const playLabel = lastWatched
    ? `▶ ${t('resumeEpisode')}${isMovie ? '' : ` E${lastWatched.episode}`} (${timestamp(lastWatched.position)})`
    : `▶ ${t('play')}${isMovie ? '' : ` E${episodes[0]?.number ?? 1}`}`;
  const toggle = () => {
    haptic();
    setStorageError(false);
    void toggleBookmark({ slug: series.slug, title: series.title, poster: series.image ?? '' })
      .then(() => setConfirmRemoval(false)).catch(() => setStorageError(true));
  };
  const meta = [series.released || series.season, series.type, series.status,
    !isMovie && `${episodes.length} ${t('episodesLabel')}`].filter(Boolean).join(' · ');
  return <View style={styles.screen}><AmbientBackground />
    <FlatList onScroll={event => setScrolled(event.nativeEvent.contentOffset.y > 24)} scrollEventThrottle={32} data={visible} keyExtractor={item => item.slug}
      initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      ListHeaderComponent={<View>
        <View style={{ height: 350, marginBottom: 24 }}>
          <Image source={series.banner ?? series.image} contentFit="cover" style={[StyleSheet.absoluteFill, { height: 325 }]} />
          <LinearGradient pointerEvents="none" colors={['#0B0D1200', '#0B0D12E6']} style={{ position: 'absolute', left: 0, right: 0, bottom: 25, height: 180 }} />
          <View style={{ position: 'absolute', bottom: 0, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Image source={series.image} contentFit="cover" accessibilityLabel={series.title}
              style={{ width: 86, height: 129, borderRadius: radius.card, backgroundColor: colors.card }} />
            <Text variant="display" numberOfLines={2} accessibilityRole="header" style={{ flex: 1 }}>{series.title}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 24, gap: 20 }}>
          <Text variant="caption" muted>{meta}</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {target && <ActionButton primary label={playLabel} onPress={() => {
              haptic(); router.push({ pathname: '/watch/[slug]', params: { slug: target } });
            }} />}
            <ActionButton label={`${saved ? '✓' : '+'} ${t(saved ? 'inMyList' : 'myList')}`}
              onPress={() => saved ? setConfirmRemoval(true) : toggle()} />
          </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {series.genres.map(name => {
                const link = series.genreLinks?.find(item => item.name === name);
                return <Button key={name} variant="secondary" size="sm" style={{ borderRadius: 6 }}
                  onPress={() => link && router.push({ pathname: '/genre/[slug]', params: { slug: link.slug } })}>
                  <Text variant="caption" numberOfLines={1}>{name}</Text>
                </Button>;
              })}
            </View>
        </View>
        <View style={{ padding: 24, gap: 12 }}>
          {storageError && <Text accessibilityRole="alert">{t('storageError')}</Text>}
          {shareError && <Text accessibilityRole="alert">{t('shareError')}</Text>}
          <View><Synopsis text={series.synopsis} /></View>
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
      ListFooterComponent={genre ? <View style={{ paddingBottom: 24 }}><Row title={t('moreLikeThis')}
          items={related.data?.pages.flatMap(page => page.items).filter(item => item.slug !== series.slug) ?? []}
          loading={related.isPending} error={related.isError} retry={() => void related.refetch()}
          itemKey={item => item.slug} renderItem={item => <PosterCard item={item} />} /></View> : undefined}
      ListEmptyComponent={<View style={{ padding: 24, gap: 16 }}>
        <Text muted>{t('noEpisodes')}</Text><ActionButton label={t('backHome')} onPress={() => router.replace('/')} />
      </View>}
      renderItem={({ item }) => <View style={{ marginHorizontal: 24 }}><EpisodeRow episode={item} seriesSlug={series.slug} seriesTitle={series.title} image={series.banner ?? series.image} /></View>} />
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16, zIndex: 10, backgroundColor: scrolled ? colors.bg : 'transparent', flexDirection: 'row', justifyContent: 'space-between' }}>
      <SeriesBackButton />
      {scrolled && <Text variant="title" numberOfLines={1} style={{ flex: 1, alignSelf: 'center', marginHorizontal: 12 }}>{series.title}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {target && <DownloadButton metadata={{ slug: target, seriesSlug: series.slug, seriesTitle: series.title, episode: episodes.find(item => item.slug === target)?.number ?? '', poster: series.image ?? '' }} />}
        <IconButton label={t('share')} icon="share-outline" onPress={() => {
          setShareError(false);
          void Share.share({ message: `anistream://series/${series.slug}` }).catch(() => setShareError(true));
        }} />
      </View>
    </View>
    <BrowseNavigation selected="home" />
    <RemovalDialog open={confirmRemoval} onOpenChange={setConfirmRemoval} title={t('removeBookmark')}
      description={series.title} error={storageError} onRemove={toggle} />
  </View>;
}
export function SeriesSkeleton() {
  const insets = useSafeAreaInsets();
  return <View style={styles.screen}><AmbientBackground />
    <SkeletonBox height={325} style={{ borderRadius: 0 }} />
    <View style={{ position: 'absolute', top: 221, left: 24 }}><SkeletonBox width={86} height={129} /></View>
    <View style={{ position: 'absolute', top: 260, left: 126, right: 24 }}><SkeletonText lines={2} lineHeight={30} /></View>
    <View style={{ paddingHorizontal: 24, paddingTop: 49, gap: 24 }}>
      <SkeletonBox width="75%" height={16} />
      <View style={{ flexDirection: 'row', gap: 12 }}><SkeletonBox width="48%" height={40} style={{ borderRadius: 20 }} /><SkeletonBox width="48%" height={40} style={{ borderRadius: 20 }} /></View>
      <SkeletonBox height={30} />
      <SkeletonMotionControl><SkeletonText lines={3} lineHeight={16} /></SkeletonMotionControl>
      <SkeletonBox width="35%" height={24} />
      <SkeletonBox height={88} /><SkeletonBox height={88} />
    </View>
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
