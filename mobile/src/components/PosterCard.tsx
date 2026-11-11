import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Card } from './ui/card';
import { Text } from './Text';
import { colors, radius } from '@/theme';

export type CardItem = { slug: string; title: string; image: string | null; kind?: 'series' | 'episode' };
export function openCard(item: CardItem) {
  router.push({ pathname: item.kind === 'episode' ? '/watch/[slug]' : '/series/[slug]', params: { slug: item.slug } });
}
export function PosterCard({ item, width = 104, onLongPress }: { item: CardItem; width?: number; onLongPress?: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => openCard(item)} onLongPress={onLongPress}
    style={({ pressed }) => ({ width, transform: [{ scale: pressed ? 0.97 : 1 }], gap: 8 })}>
    <Card className="gap-0 border-0 p-0 shadow-none" style={{ width, height: width * 1.5, backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' }}>
      <Image source={item.image} contentFit="cover" transition={200} style={{ width: '100%', height: '100%' }} />
    </Card>
    <Text variant="caption" numberOfLines={2} style={{ minHeight: 32 }}>{item.title}</Text>
  </Pressable>;
}
