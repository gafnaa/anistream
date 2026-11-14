import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMovies, useMovieGenres } from '@/api';
import { PosterGrid } from '@/components/PosterGrid';
import { BrowseNavigation } from '@/components/BrowseNavigation';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/Text';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function Movies() {
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [list, setList] = useState('trending');
  const [genre, setGenre] = useState('');
  const query = useMovies({ type, list, genre });
  const genres = useMovieGenres(type);
  const header = <View style={{ gap: 16, paddingVertical: 24 }}>
    <Text variant="h1">{t('moviesAndTv')}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['movie', 'tv'] as const).map(value => <Button key={value} variant={type === value ? 'secondary' : 'outline'}
        accessibilityState={{ selected: type === value }} onPress={() => { setType(value); setGenre(''); setList('trending'); }}>
        <Text>{t(value === 'movie' ? 'films' : 'tvSeries')}</Text>
      </Button>)}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['trending', 'popular', 'top', 'now'] as const).map(value => <Button key={value}
        variant={list === value ? 'secondary' : 'outline'} accessibilityState={{ selected: list === value }}
        onPress={() => { setList(value); setGenre(''); }}>
        <Text variant="caption">{t(value === 'trending' ? 'trending' : value === 'popular' ? 'moviePopular' : value === 'top' ? 'movieTop' : 'movieNow')}</Text>
      </Button>)}
    </View>
    <Text variant="h2">{t('browseGenres')}</Text>
    {genres.isError && <Button variant="outline" onPress={() => void genres.refetch()}><Text>{t('retry')}</Text></Button>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {genres.data?.map(item => <Button key={item.slug} variant={genre === item.slug ? 'secondary' : 'outline'}
        accessibilityState={{ selected: genre === item.slug }} onPress={() => { setGenre(item.slug); setList('genre'); }}>
        <Text variant="caption">{item.name}</Text>
      </Button>)}
    </View>
  </View>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <PosterGrid header={header} items={query.data?.pages.flatMap(page => page.items) ?? []}
      loading={query.isPending} error={query.isError} retry={() => void query.refetch()}
      fetchingNext={query.isFetchingNextPage} next={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }} />
    <BrowseNavigation />
  </SafeAreaView>;
}
