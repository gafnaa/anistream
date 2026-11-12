import { RecoveryState } from './RecoveryState';
import { useOffline, OfflineState } from './Connectivity';
import type { ReactElement } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PosterCard, type CardItem } from './PosterCard';
import { PosterSkeleton, SkeletonMotionControl } from './skeleton';
import { useTabBarInset } from './GlassTabBar';
import { ActionButton } from './ActionButton';
import { Text } from './Text';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { t } from '@/i18n';

export function PosterGrid({ items, header, loading = false, error = false, retry, next, fetchingNext = false,
  tabScreen = false, empty, footer, onLongPress }: {
  onLongPress?: (item: CardItem) => void;
  items: CardItem[]; header?: ReactElement; loading?: boolean; error?: boolean; retry: () => void;
  next?: () => void; fetchingNext?: boolean; tabScreen?: boolean; empty?: ReactElement; footer?: ReactElement;
}) {
  const offline = useOffline();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const posterWidth = (width - 72) / 3;
  const showSkeleton = useDelayedSkeleton(loading);
  const skeletons = <SkeletonMotionControl><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {Array.from({ length: fetchingNext ? 3 : 9 }, (_, i) => <View key={i} style={{ width: posterWidth, gap: 8, paddingBottom: 20 }}>
      <PosterSkeleton width={posterWidth} /><View style={{ height: 32 }} />
    </View>)}
  </View></SkeletonMotionControl>;
  const failure = <View accessibilityRole="alert" style={{ gap: 12, paddingVertical: 24 }}>
    <Text muted>{t('catalogueError')}</Text><ActionButton label={t('retry')} onPress={retry} />
  </View>;
  const unique = [...new Map(items.map(item => [item.slug, item])).values()];
  return <FlatList data={loading ? [] : unique} numColumns={3} keyExtractor={item => item.slug}
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: tabScreen ? tabInset : insets.bottom + 100 }}
    columnWrapperStyle={{ gap: 12 }} initialNumToRender={12} windowSize={5}
    ListHeaderComponent={header}
    renderItem={({ item }) => <View style={{ paddingBottom: 20 }}><PosterCard item={item} width={posterWidth} onLongPress={onLongPress ? () => onLongPress(item) : undefined} /></View>}
    ListEmptyComponent={offline && (loading || error) ? <OfflineState retry={retry} /> : loading ? <View style={{ minHeight: 600 }}>{showSkeleton && skeletons}</View>
      : error ? <RecoveryState kind="error" title={t('catalogueError')} description={t('homeErrorBody')} label={t('retry')} action={retry} /> : empty ?? <Text muted style={{ paddingVertical: 24 }}>{t('emptyRow')}</Text>}
    ListFooterComponent={unique.length > 0 ? error ? failure : fetchingNext ? skeletons : footer : undefined}
    onEndReached={next} onEndReachedThreshold={0.5} />;
}
