import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';
import { Image } from 'expo-image';
import { GenreSuggestions , QuickFilters } from '@/components/CatalogueControls';
import { useHome, useGenres } from '@/api';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { SkeletonBox, SkeletonMotionControl } from '@/components/skeleton';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { colors, genreGradients } from '@/theme';
import { t } from '@/i18n';

const palette = Object.values(genreGradients);
export default function Discover() {
  const genres = useGenres();
  const [allGenres, setAllGenres] = useState(false);
  const home = useHome();
  const artwork = [...(home.data?.trending ?? []), ...(home.data?.ongoing ?? [])];
  const skeleton = useDelayedSkeleton(genres.isPending);
  return <Screen title={t('discover')} titleVariant="h1" preview={false}>
    <Button variant="secondary" accessibilityLabel={t('searchHint')} onPress={() => router.push('/search')}
      style={{ justifyContent: 'flex-start', gap: 12, height: 48, borderRadius: 6, borderWidth: 1, borderColor: colors.line }}>
      <Icon name="search-outline" size={24} color={colors['text-muted']} />
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
          {Array.from({ length: 10 }, (_, i) => <SkeletonBox key={i} width="48%" height={118} />)}
        </View>
      </SkeletonMotionControl>}</View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[...(genres.data ?? [])].sort((a, b) => { const order = ['action', 'fantasy', 'romance', 'comedy', 'sports', 'supernatural']; return (order.includes(a.slug) ? order.indexOf(a.slug) : 99) - (order.includes(b.slug) ? order.indexOf(b.slug) : 99); }).slice(0, allGenres ? undefined : 6).map((genre, i) => <Button key={genre.slug} variant="ghost"
          accessibilityLabel={genre.name} className="p-0 active:opacity-70"
          style={{ width: '48%', height: 118, overflow: 'hidden', borderRadius: 10 }}
          onPress={() => router.push({ pathname: '/genre/[slug]', params: { slug: genre.slug } })}>
          <LinearGradient colors={genreGradients[genre.name as keyof typeof genreGradients] ?? palette[i % palette.length]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: '100%', justifyContent: 'flex-end', padding: 16, gap: 4 }}>
            {artwork.length > 0 && <Image source={artwork[i % artwork.length]?.image} contentFit="cover" style={{ position: 'absolute', inset: 0, opacity: 0.28 }} />}
            <Text variant="h2" numberOfLines={2} style={genre.name.length > 14 ? { fontSize: 15, lineHeight: 21 } : undefined}>{genre.name}</Text>
            {genre.count !== undefined && <Text variant="caption" tabular>{genre.count} {t('titles')}</Text>}
          </LinearGradient>
        </Button>)}
      </View>}
    </View>
    <GenreSuggestions genres={genres.data} />
    <Button variant="outline" onPress={() => setAllGenres(value => !value)} accessibilityState={{ expanded: allGenres }}><Text variant="caption">{t(allGenres ? 'less' : 'browseAllGenres')}</Text></Button>
  </Screen>;
}
