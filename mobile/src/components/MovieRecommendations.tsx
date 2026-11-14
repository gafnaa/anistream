import { useMovieRecommendations } from '@/api';
import { t } from '@/i18n';
import { Row } from './Row';
import { PosterCard } from './PosterCard';

export function MovieRecommendations({ slug }: { slug: string }) {
  const query = useMovieRecommendations(slug);
  return <Row title={t('recommended')} items={query.data?.items ?? []}
    loading={query.isPending} error={query.isError} retry={() => void query.refetch()}
    itemKey={item => item.slug} renderItem={item => <PosterCard item={item} />} />;
}
