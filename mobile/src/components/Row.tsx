import { useOffline } from './Connectivity';
import { useBlockTabSwipe } from './SwipeTabScreen';
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
  const offline = useOffline();
  const blockTabSwipe = useBlockTabSwipe();
  const skeleton = useDelayedSkeleton(loading);
  const height = landscape ? 239 : 224;
  if (loading && !offline) return <View style={{ height, paddingHorizontal: 24 }}>{skeleton && (landscape
    ? <View style={{ gap: 16 }}><SkeletonBox height={24} width="44%" /><SkeletonBox height={135} width={240} /></View>
    : <RowSkeleton posterWidth={104} />)}</View>;
  return <View style={{ minHeight: height, gap: 16 }}>
    <Text variant="h2" accessibilityRole="header" style={{ paddingHorizontal: 24 }}>{title}</Text>
    {(error || offline) && items.length === 0 ? <View style={{ paddingHorizontal: 24, gap: 8 }}><Text muted>{t(offline ? 'offlineTitle' : 'rowError')}</Text>
      {retry && <ActionButton label={t('retry')} onPress={retry} />}</View>
      : items.length === 0 ? <Text muted style={{ paddingHorizontal: 24 }}>{t('emptyRow')}</Text>
      : <FlatList horizontal onTouchStart={blockTabSwipe} onPointerDown={blockTabSwipe} data={items} keyExtractor={itemKey} renderItem={({ item }) => renderItem(item)}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }} showsHorizontalScrollIndicator={false}
        initialNumToRender={4} maxToRenderPerBatch={5} windowSize={3} onEndReached={onEndReached} onEndReachedThreshold={0.5} />}
  </View>;
}
