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
export function PosterCard({ item, width = 96 }: { item: CardItem; width?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => openCard(item)}
    style={({ pressed }) => ({ width, opacity: pressed ? 0.7 : 1, gap: 8 })}>
    <Card className="gap-0 border-0 p-0 shadow-none" style={{ width, height: width * 1.5, backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' }}>
      <Image source={item.image} contentFit="cover" transition={200} style={{ width: '100%', height: '100%' }} />
    </Card>
    <Text variant="caption" numberOfLines={2} style={{ minHeight: 32 }}>{item.title}</Text>
  </Pressable>;
}
