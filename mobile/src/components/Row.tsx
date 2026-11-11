import type { ReactElement } from 'react';
import { FlatList, View } from 'react-native';
import { Text } from './Text';
import { RowSkeleton, SkeletonBox } from './skeleton';
import { ActionButton } from './ActionButton';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { t } from '@/i18n';

export function Row<T>({ title, items, renderItem, itemKey, loading = false, error = false, retry, landscape = false, onEndReached }: {
  title: string; items: T[]; renderItem: (item: T) => ReactElement; itemKey: (item: T) => string;
  loading?: boolean; error?: boolean; retry?: () => void; landscape?: boolean; onEndReached?: () => void;
}) {
  const skeleton = useDelayedSkeleton(loading);
  const height = landscape ? 239 : 224;
  if (loading) return <View style={{ height, paddingHorizontal: 16 }}>{skeleton && (landscape
    ? <View style={{ gap: 16 }}><SkeletonBox height={24} width="44%" /><SkeletonBox height={135} width={240} /></View>
    : <RowSkeleton posterWidth={96} />)}</View>;
  return <View style={{ minHeight: height, gap: 16 }}>
    <Text variant="h2" accessibilityRole="header" style={{ paddingHorizontal: 16 }}>{title}</Text>
    {error && items.length === 0 ? <View style={{ paddingHorizontal: 16, gap: 8 }}><Text muted>{t('rowError')}</Text>
      {retry && <ActionButton label={t('retry')} onPress={retry} />}</View>
      : items.length === 0 ? <Text muted style={{ paddingHorizontal: 16 }}>{t('emptyRow')}</Text>
      : <FlatList horizontal data={items} keyExtractor={itemKey} renderItem={({ item }) => renderItem(item)}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} showsHorizontalScrollIndicator={false}
        initialNumToRender={4} maxToRenderPerBatch={5} windowSize={3} onEndReached={onEndReached} onEndReachedThreshold={0.5} />}
  </View>;
}
