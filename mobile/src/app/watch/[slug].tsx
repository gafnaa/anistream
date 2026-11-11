import { useLocalSearchParams } from 'expo-router';
import { WatchScreen } from '@/components/player/WatchScreen';

export default function Watch() {
  const { slug, preview } = useLocalSearchParams<{ slug: string; preview?: string }>();
  return <WatchScreen key={slug} slug={slug} previewNext={__DEV__ && preview === 'upnext'} />;
}
