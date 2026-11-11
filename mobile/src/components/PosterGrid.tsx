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
  tabScreen = false, empty }: {
  items: CardItem[]; header?: ReactElement; loading?: boolean; error?: boolean; retry: () => void;
  next?: () => void; fetchingNext?: boolean; tabScreen?: boolean; empty?: ReactElement;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const posterWidth = (width - 56) / 3;
  const showSkeleton = useDelayedSkeleton(loading);
  const skeletons = <SkeletonMotionControl overlayControl><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
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
    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreen ? tabInset : insets.bottom + 24 }}
    columnWrapperStyle={{ gap: 12 }} initialNumToRender={12} windowSize={5}
    ListHeaderComponent={header}
    renderItem={({ item }) => <View style={{ paddingBottom: 20 }}><PosterCard item={item} width={posterWidth} /></View>}
    ListEmptyComponent={loading ? <View style={{ minHeight: 600 }}>{showSkeleton && skeletons}</View>
      : error ? failure : empty ?? <Text muted style={{ paddingVertical: 24 }}>{t('emptyRow')}</Text>}
    ListFooterComponent={unique.length > 0 ? error ? failure : fetchingNext ? skeletons : undefined : undefined}
    onEndReached={next} onEndReachedThreshold={0.5} />;
}
