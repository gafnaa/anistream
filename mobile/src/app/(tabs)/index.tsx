import { useMemo, useState } from 'react';
import { Animated, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHome, useLatest, useBrowse } from '@/api';
import type { TrendingCard } from '@/api/types';
import { Text } from '@/components/Text';
import { HeroBanner, HERO_HEIGHT } from '@/components/HeroBanner';
import { Row } from '@/components/Row';
import { PosterCard } from '@/components/PosterCard';
import { EpisodeCard } from '@/components/EpisodeCard';
import { ContinueCard } from '@/components/ContinueCard';
import { ActionButton } from '@/components/ActionButton';
import { HeroSkeleton } from '@/components/skeleton';
import { useTabBarInset } from '@/components/GlassTabBar';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { useHistory } from '@/storage';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function Home() {
  const home = useHome();
  const latest = useLatest();
  const completed = useBrowse({ status: 'completed' });
  const history = useHistory();
  const skeleton = useDelayedSkeleton(home.isPending);
  const bottom = useTabBarInset();
  const insets = useSafeAreaInsets();
  const [scroll] = useState(() => new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);
  // samehadaku only features one trending title, so top the hero up with
  // ongoing series to give it something to rotate through.
  const heroItems = useMemo<TrendingCard[]>(() => {
    if (!home.data) return [];
    const seen = new Set<string>();
    const pool = [...home.data.trending, ...home.data.ongoing.filter(item => item.kind === 'series')];
    return pool.filter(item => !seen.has(item.slug) && seen.add(item.slug))
      .slice(0, 5)
      .map(({ slug, title, image }) => ({ slug, title, image, kind: 'series' as const }));
  }, [home.data]);
  // A one-item row looks broken; the hero already shows trending titles.
  const showTrendingRow = (home.data?.trending.length ?? 0) >= 3;
  // When Home itself failed, the page-level error covers the rows built from it.
  const homeFailed = home.isError && !home.data;
  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([home.refetch(), latest.refetch(), completed.refetch()]);
    setRefreshing(false);
  };
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Animated.ScrollView scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scroll } } }], { useNativeDriver: false })}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.brand} progressViewOffset={insets.top + 56} />}
      contentContainerStyle={{ paddingBottom: bottom + 24, gap: 24 }}>
      {home.isError && !home.data ? <View style={{ minHeight: HERO_HEIGHT, padding: 24, paddingTop: insets.top + 100, gap: 16, justifyContent: 'center' }}>
        <Text variant="h1">{t('homeError')}</Text><Text muted>{t('homeErrorBody')}</Text>
        <ActionButton primary label={t('retry')} onPress={() => void refresh()} />
      </View> : home.data ? <HeroBanner items={heroItems} />
        : <View style={{ height: HERO_HEIGHT }}>{skeleton && <View style={{ height: HERO_HEIGHT }}><HeroSkeleton height={HERO_HEIGHT} /></View>}</View>}
      {home.data && home.isError && <View accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingVertical: 4, gap: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface }}>
        <Text variant="caption" style={{ flex: 1 }}>{t('cachedError')}</Text><ActionButton label={t('retry')} onPress={() => void refresh()} />
      </View>}
      {history.length > 0 && <Row title={t('continueWatching')} items={history} landscape itemKey={item => item.episodeSlug} renderItem={item => <ContinueCard item={item} />} />}
      {showTrendingRow && <Row title={t('trending')} items={home.data?.trending ?? []} loading={home.isPending} error={home.isError}
        retry={() => void home.refetch()} itemKey={item => item.slug} renderItem={item => <PosterCard item={item} />} />}
      {!homeFailed && <Row title={t('ongoing')} items={home.data?.ongoing ?? []} loading={home.isPending} error={home.isError}
        retry={() => void home.refetch()} itemKey={item => item.slug} renderItem={item => <PosterCard item={item} />} />}
      {!homeFailed && <Row title={t('latestEpisodes')} items={latest.data?.pages.flatMap(page => page.items) ?? []} landscape loading={latest.isPending}
        error={latest.isError} retry={() => void latest.refetch()} itemKey={item => item.slug} renderItem={item => <EpisodeCard item={item} />}
        onEndReached={() => { if (latest.hasNextPage && !latest.isFetchingNextPage) void latest.fetchNextPage(); }} />}
      {!homeFailed && <Row title={t('completed')} items={completed.data?.pages.flatMap(page => page.items) ?? []} loading={completed.isPending}
        error={completed.isError} retry={() => void completed.refetch()} itemKey={item => item.slug} renderItem={item => <PosterCard item={item} />} />}
    </Animated.ScrollView>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: colors.surface,
        opacity: scroll.interpolate({ inputRange: [0, 160, 240], outputRange: [0, 0.8, 1], extrapolate: 'clamp' }) }} />
      <View style={{ height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="h2">AniStream</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('search')} onPress={() => router.push('/search')}
          style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="search-outline" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  </View>;
}
