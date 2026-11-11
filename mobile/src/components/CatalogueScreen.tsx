import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBrowse } from '@/api';
import type { BrowseParams } from '@/api/types';
import { PosterGrid } from './PosterGrid';
import { SeriesBackButton } from './SeriesDetail';
import { GenreSuggestions } from './CatalogueControls';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Button } from './ui/button';
import { Text } from './Text';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function CatalogueScreen({ title, params, count }: { title: string; params: BrowseParams; count?: number }) {
  const [order, setOrder] = useState('update');
  const [status, setStatus] = useState(params.status ?? '');
  const query = useBrowse({ ...params, status, order });
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ paddingHorizontal: 8 }}><SeriesBackButton /></View>
    <PosterGrid key={`${status}:${order}`} items={items} loading={query.isPending} error={query.isError} retry={() => void query.refetch()}
      fetchingNext={query.isFetchingNextPage}
      next={() => { if (query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage(); }}
      header={<View style={{ gap: 16, paddingTop: 8, paddingBottom: 24 }}>
        <Text variant="display" accessibilityRole="header">{title}</Text>
        <Text variant="caption" muted tabular>{count !== undefined ? `${count} ${t('titles')}`
          : query.data ? `${new Set(items.map(item => item.slug)).size}${query.hasNextPage ? '+' : ''} ${t('titlesLoaded')}` : t('browseHint')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ToggleGroup type="single" value={order} onValueChange={value => { if (value) setOrder(value); }}>
            {(['update', 'title', 'popular'] as const).map((value, i) => <ToggleGroupItem key={value} value={value}
              isFirst={i === 0} isLast={i === 2} className="px-3" style={{ flexGrow: 0, flexShrink: 0, minWidth: i === 0 ? 150 : 72 }}>
              <Text variant="caption">{t(value === 'update' ? 'latestUpdate' : value === 'title' ? 'sortAZ' : 'sortPopular')}</Text>
            </ToggleGroupItem>)}
          </ToggleGroup>
        </ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['', 'ongoing', 'completed'] as const).map(value => <Button key={value} variant={status === value ? 'default' : 'outline'}
            size="sm" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)}>
            <Text variant="caption" style={status === value ? { color: '#FFFFFF' } : undefined}>{t(value === '' ? 'filterAll' : value === 'ongoing' ? 'filterOngoing' : 'filterCompleted')}</Text>
          </Button>)}
        </View>
      </View>}
      empty={<View style={{ gap: 24, paddingVertical: 16 }}><Text muted>{t('catalogueEmpty')}</Text><GenreSuggestions /></View>} />
  </SafeAreaView>;
}
