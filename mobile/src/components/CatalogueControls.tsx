import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button } from './ui/button';
import { Text } from './Text';
import { useBlockTabSwipe } from './SwipeTabScreen';
import { colors } from '@/theme';
import { fallbackGenres } from '@/api/genres';
import type { Genre } from '@/api/types';
import { t, type TranslationKey } from '@/i18n';

export function FilterChip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Button variant="secondary" size="sm" accessibilityState={{ selected }} onPress={onPress}
    style={{ height: 38, minHeight: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: selected ? colors.primary : colors.card }}>
    <Text variant="caption" style={{ color: selected ? '#FFFFFF' : colors['text-muted'] }}>{label}</Text>
  </Button>;
}

export const quickFilters: { label: TranslationKey; params: { status?: string; type?: string } }[] = [
  { label: 'filterOngoing', params: { status: 'ongoing' } },
  { label: 'filterCompleted', params: { status: 'completed' } },
  { label: 'filterMovie', params: { type: 'movie' } },
  { label: 'filterTV', params: { type: 'tv' } },
  { label: 'filterOVA', params: { type: 'ova' } },
];
export function QuickFilters() {
  const blockTabSwipe = useBlockTabSwipe();
  return <ScrollView onTouchStart={blockTabSwipe} onPointerDown={blockTabSwipe} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {quickFilters.map(filter => <FilterChip key={filter.label} label={t(filter.label)}
      onPress={() => router.push({ pathname: '/browse', params: filter.params })} />)}
  </ScrollView>;
}
export function GenreSuggestions({ genres = fallbackGenres }: { genres?: Genre[] }) {
  const popular = fallbackGenres.map(item => genres.find(genre => genre.slug === item.slug) ?? item).slice(0, 6);
  return <View style={{ gap: 12 }}>
    <Text variant="h2">{t('popularGenres')}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {popular.map(genre => <Button variant="outline" size="sm" key={genre.slug}
        onPress={() => router.push({ pathname: '/genre/[slug]', params: { slug: genre.slug } })}>
        <Text variant="caption">{genre.name}</Text>
      </Button>)}
    </View>
  </View>;
}
