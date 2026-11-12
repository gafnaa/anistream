import { EpisodeImage } from './EpisodeImage';
import { Press } from '@/components/Press';
import { View } from 'react-native';
import { Text } from './Text';
import { Badge } from './Chip';
import { openCard } from './PosterCard';
import type { CatalogueCard } from '@/api/types';
import { colors, radius } from '@/theme';

export function EpisodeCard({ item }: { item: CatalogueCard }) {
  return <Press accessibilityRole="button" accessibilityLabel={item.episodeTitle ?? item.title}
    onPress={() => openCard(item)} style={({ pressed }) => ({ width: 240, gap: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
    <View style={{ height: 135, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.card }}>
      <EpisodeImage slug={item.kind === 'episode' ? item.slug : null} fallback={item.image} style={{ width: '100%', height: '100%' }} />
      {item.episode != null && <View style={{ position: 'absolute', bottom: 8, left: 8 }}><Badge label={`E${item.episode}`} tone="pink" /></View>}
    </View>
    <Text variant="title" style={{ minHeight: 40 }}>{item.title}</Text>
  </Press>;
}
