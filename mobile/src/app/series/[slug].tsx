import { useOffline, OfflineState } from '@/components/Connectivity';
import { router , useLocalSearchParams } from 'expo-router';
import { AmbientBackground } from '@/components/AmbientBackground';
import { RecoveryState } from '@/components/RecoveryState';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSeries } from '@/api';
import { ApiError } from '@/api/client';
import { SeriesBackButton, SeriesDetail, SeriesSkeleton } from '@/components/SeriesDetail';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function Series() {
  const offline = useOffline();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useSeries(slug ?? '');
  const skeleton = useDelayedSkeleton(query.isPending);
  const insets = useSafeAreaInsets();
  if (query.data?.title) return <SeriesDetail key={slug} series={query.data} />;
  if (offline) return <View style={{ flex: 1, backgroundColor: colors.bg }}><AmbientBackground /><SeriesBackButton /><OfflineState retry={() => { void query.refetch(); }} /></View>;
  if (query.isPending && slug) return skeleton ? <SeriesSkeleton /> : <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  const notFound = !slug || query.data || (query.error instanceof ApiError && query.error.status === 404);
  return <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: insets.top + 8, gap: 24 }}>
    <AmbientBackground />
    <SeriesBackButton />
    <RecoveryState kind={notFound ? 'missing' : 'error'} title={t(notFound ? 'seriesNotFound' : 'seriesError')}
      description={t(notFound ? 'notFoundBody' : 'homeErrorBody')} label={t(notFound ? 'search' : 'retry')}
      action={() => notFound ? router.push('/search') : void query.refetch()} secondary={() => router.replace('/')} secondaryLabel={t('backHome')} />
  </View>;
}
