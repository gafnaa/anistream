import { router } from 'expo-router';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGenres } from '@/api';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { QuickFilters } from '@/components/CatalogueControls';
import { SkeletonBox, SkeletonMotionControl } from '@/components/skeleton';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { colors, genreGradients } from '@/theme';
import { t } from '@/i18n';

const palette = Object.values(genreGradients);
export default function Discover() {
  const genres = useGenres();
  const skeleton = useDelayedSkeleton(genres.isPending);
  return <Screen title={t('discover')} titleVariant="display" preview={false}>
    <Button variant="secondary" accessibilityLabel={t('searchHint')} onPress={() => router.push('/search')}
      style={{ justifyContent: 'flex-start', gap: 12, minHeight: 56 }}>
      <Ionicons name="search-outline" size={22} color={colors['text-muted']} />
      <Text muted>{t('searchHint')}</Text>
    </Button>
    <QuickFilters />
    <View style={{ gap: 16 }}>
      <Text variant="h2">{t('browseGenres')}</Text>
      {genres.isError && <View style={{ gap: 12 }}>
        <Text muted accessibilityRole="alert">{t('genreFallback')}</Text>
        <Button variant="outline" onPress={() => void genres.refetch()}><Text>{t('retry')}</Text></Button>
      </View>}
      {genres.isPending ? <View style={{ minHeight: 600 }}>{skeleton && <SkeletonMotionControl overlayControl>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {Array.from({ length: 10 }, (_, i) => <SkeletonBox key={i} width="48%" height={104} />)}
        </View>
      </SkeletonMotionControl>}</View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {genres.data?.map((genre, i) => <Button key={genre.slug} variant="ghost"
          accessibilityLabel={genre.name} className="p-0 active:opacity-70"
          style={{ width: '48%', height: 104, overflow: 'hidden', borderRadius: 10 }}
          onPress={() => router.push({ pathname: '/genre/[slug]', params: { slug: genre.slug } })}>
          <LinearGradient colors={genreGradients[genre.name as keyof typeof genreGradients] ?? palette[i % palette.length]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: '100%', justifyContent: 'flex-end', padding: 16, gap: 4 }}>
            <Text variant="h2" numberOfLines={2} style={genre.name.length > 14 ? { fontSize: 15, lineHeight: 21 } : undefined}>{genre.name}</Text>
            {genre.count !== undefined && <Text variant="caption" tabular>{genre.count} {t('titles')}</Text>}
          </LinearGradient>
        </Button>)}
      </View>}
    </View>
  </Screen>;
}
