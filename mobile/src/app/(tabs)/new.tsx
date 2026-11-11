import { SectionList, RefreshControl, View } from 'react-native';
import { useLatest } from '@/api';
import { useBookmarks } from '@/storage';
import { ActivityLayout } from '@/components/ActivityLayout';
import { ActivityEpisodeRow } from '@/components/ActivityEpisodeRow';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { ListItemSkeleton, SkeletonMotionControl } from '@/components/skeleton';
import { useTabBarInset } from '@/components/GlassTabBar';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function New() {
  const query = useLatest();
  const bookmarks = useBookmarks();
  const bottom = useTabBarInset();
  const items = [...new Map((query.data?.pages.flatMap(page => page.items) ?? []).map(item => [item.slug, item])).values()];
  const skeleton = <SkeletonMotionControl>{[0, 1, 2, 3, 4].map(i => <ListItemSkeleton key={i} />)}</SkeletonMotionControl>;
  const failure = <View style={{ gap: 12, paddingVertical: 24 }}><Text accessibilityRole="alert" muted>{t('catalogueError')}</Text><Button onPress={() => void query.refetch()}><Text>{t('retry')}</Text></Button></View>;
  return <ActivityLayout><SectionList sections={items.length ? [{ title: t('latestUpdate'), data: items }] : []} keyExtractor={item => item.slug}
    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom }} stickySectionHeadersEnabled={false}
    ListHeaderComponent={<View style={{ paddingTop: 24, gap: 24, paddingBottom: 32 }}><Text variant="h1" accessibilityRole="header">{t('new')}</Text>
      {/* TODO(M8): add the schedule segment here when /api/schedule is available. */}
      <View style={{ flexDirection: 'row', gap: 10 }}><View accessibilityRole="tab" accessibilityState={{ selected: true }} style={{ width: '49%', padding: 8, borderWidth: 1, borderColor: colors.brand, borderRadius: 6, backgroundColor: '#F43F5E1F' }}><Text variant="caption" style={{ color: colors.accent }}>{t('latestSegment')}</Text></View></View>
    </View>}
    renderSectionHeader={({ section }) => <Text variant="h2" style={{ marginBottom: 6 }}>{section.title}</Text>}
    renderItem={({ item }) => <ActivityEpisodeRow slug={item.slug} title={item.title} episode={String(item.episode ?? '')} image={item.image}
      meta={`${t('releaseUnknown')}${bookmarks.some(saved => saved.title.trim().toLowerCase() === item.title.trim().toLowerCase()) ? ` · ${t('savedMarker')}` : ''}`} />}
    ListEmptyComponent={query.isPending ? skeleton : query.isError ? failure : <Text muted>{t('emptyRow')}</Text>}
    ListFooterComponent={items.length ? query.isFetchNextPageError || query.isRefetchError ? failure : query.isFetchingNextPage ? skeleton : undefined : undefined}
    refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.brand} />}
    onEndReached={() => { if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage(); }} onEndReachedThreshold={0.5} />
  </ActivityLayout>;
}
