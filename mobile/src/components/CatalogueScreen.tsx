import { BrowseNavigation } from '@/components/BrowseNavigation';
import { AmbientBackground } from '@/components/AmbientBackground';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBrowse } from '@/api';
import type { BrowseParams } from '@/api/types';
import { PosterGrid } from './PosterGrid';
import { SeriesBackButton } from './SeriesDetail';
import { FilterChip, GenreSuggestions } from './CatalogueControls';
import { Text } from './Text';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function CatalogueScreen({ title, params, count }: { title: string; params: BrowseParams; count?: number }) {
  const [order, setOrder] = useState('update');
  const [status, setStatus] = useState(params.status ?? '');
  const query = useBrowse({ ...params, status, order });
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <AmbientBackground /><View style={{ paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' }}><SeriesBackButton /><Text variant="h2" accessibilityRole="header">{title}</Text></View>
    <PosterGrid key={`${status}:${order}`} items={items} loading={query.isPending} error={query.isError} retry={() => void query.refetch()}
      fetchingNext={query.isFetchingNextPage}
      next={() => { if (query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage(); }}
      header={<View style={{ gap: 12, paddingTop: 8, paddingBottom: 24 }}>
        <Text variant="caption" muted tabular>{count !== undefined ? `${count} ${t('titles')}`
          : query.data ? `${new Set(items.map(item => item.slug)).size}${query.hasNextPage ? '+' : ''} ${t('titlesLoaded')}` : t('browseHint')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['', 'ongoing', 'completed'] as const).map(value => <FilterChip key={value} selected={status === value}
            onPress={() => setStatus(value)} label={t(value === '' ? 'filterAll' : value === 'ongoing' ? 'filterOngoing' : 'filterCompleted')} />)}
        </ScrollView>
        <View style={{ gap: 8 }}>
          <Text variant="caption" muted>{t('sortBy')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(['update', 'title', 'popular', 'rating'] as const).map(value => <FilterChip key={value} selected={order === value}
              onPress={() => setOrder(value)} label={t(value === 'update' ? 'latestUpdate' : value === 'title' ? 'sortAZ' : value === 'rating' ? 'sortRating' : 'sortPopular')} />)}
          </ScrollView>
        </View>
      </View>}
      empty={<View style={{ gap: 24, paddingVertical: 16 }}><Text muted>{t('catalogueEmpty')}</Text><GenreSuggestions /></View>} />
    <BrowseNavigation />
  </SafeAreaView>;
}
