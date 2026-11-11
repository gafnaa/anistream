import { useLocalSearchParams } from 'expo-router';
import { useGenres } from '@/api';
import { CatalogueScreen } from '@/components/CatalogueScreen';

export default function GenreResults() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const genres = useGenres();
  const genre = genres.data?.find(item => item.slug === slug);
  const title = genre?.name ?? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return <CatalogueScreen key={slug} title={title} params={{ genre: slug }} count={genre?.count} />;
}
