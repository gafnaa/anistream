import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSeries } from '@/api';
import { ApiError } from '@/api/client';
import { SeriesBackButton, SeriesDetail, SeriesSkeleton } from '@/components/SeriesDetail';
import { ActionButton } from '@/components/ActionButton';
import { Text } from '@/components/Text';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function Series() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useSeries(slug ?? '');
  const skeleton = useDelayedSkeleton(query.isPending);
  const insets = useSafeAreaInsets();
  if (query.data?.title) return <SeriesDetail key={slug} series={query.data} />;
  if (query.isPending && slug) return skeleton ? <SeriesSkeleton /> : <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const notFound = !slug || query.data || (query.error instanceof ApiError && query.error.status === 404);
  return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: insets.top + 8, gap: 24 }}>
    <SeriesBackButton />
    <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
      <Text variant="h1">{t(notFound ? 'seriesNotFound' : 'seriesError')}</Text>
      <Text muted>{t('homeErrorBody')}</Text>
      <ActionButton primary label={t('retry')} onPress={() => void query.refetch()} />
    </View>
  </View>;
}
