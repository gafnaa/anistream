import { BrowseNavigation } from '@/components/BrowseNavigation';
import { AmbientBackground } from '@/components/AmbientBackground';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { useGenres, useSearch } from '@/api';
import { PosterGrid } from '@/components/PosterGrid';
import { SeriesBackButton } from '@/components/SeriesDetail';
import { GenreSuggestions } from '@/components/CatalogueControls';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { RemovalDialog } from '@/components/RemovalDialog';
import { clearSearches, removeSearch, saveSearch, useRecentSearches } from '@/storage';
import { Search as SearchIcon } from 'lucide-react-native';
import { colors, fonts } from '@/theme';
import { t } from '@/i18n';

export default function Search() {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [removal, setRemoval] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  const recent = useRecentSearches();
  const genres = useGenres();
  const query = useSearch(debounced);
  const persist = (operation: Promise<void>) => { setStorageError(false); void operation.catch(() => setStorageError(true)); };
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (debounced && query.isSuccess) {
      void saveSearch(debounced).catch(() => setStorageError(true));
    }
  }, [debounced, query.isSuccess]);
  const hasQuery = !!input.trim();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <AmbientBackground /><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}>
      <SeriesBackButton />
      <View style={{ flex: 1, minHeight: 48, borderRadius: 6, borderWidth: focused ? 2 : 1, borderColor: focused ? colors.brand : colors.line,
        backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }}>
        <Icon name="search-outline" size={20} color={colors['text-muted']} />
        <TextInput ref={field} value={input} onChangeText={setInput} autoFocus autoCorrect={false} autoCapitalize="none"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className="web:outline-none"
          accessibilityLabel={t('searchHint')} placeholder={t('searchHint')} placeholderTextColor={colors['text-muted']}
          returnKeyType="search" onSubmitEditing={() => { if (input.trim()) persist(saveSearch(input)); }}
          style={{ flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 12, color: colors.text, fontFamily: fonts.inter400, fontSize: 15 }} />
        <Button variant="ghost" size="icon" accessibilityLabel={t('clearQuery')} disabled={!input}
          onPress={() => { setInput(''); field.current?.focus(); }}>
          <Icon name="close" size={20} color={colors.text} />
        </Button>
      </View>
    </View>
    {storageError && <Text accessibilityRole="alert" style={{ paddingHorizontal: 16 }}>{t('storageError')}</Text>}
    <PosterGrid key={debounced} items={hasQuery ? query.data?.pages.flatMap(page => page.items) ?? [] : []}
      loading={hasQuery && (input.trim() !== debounced || query.isPending)} error={hasQuery && query.isError}
      retry={() => void query.refetch()} fetchingNext={query.isFetchingNextPage}
      next={() => { if (hasQuery && input.trim() === debounced && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage(); }}
      header={hasQuery ? <View style={{ paddingTop: 16, paddingBottom: 24, gap: 8 }}>
        <Text variant="h2" accessibilityRole="header">{t('searchResults')}</Text><Text muted variant="caption">{input.trim()}</Text>
      </View> : undefined}
      empty={hasQuery ? <View style={{ paddingVertical: 100, gap: 24, alignItems: 'center' }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><SearchIcon size={36} color={colors['text-muted']} /></View><View style={{ gap: 8 }}><Text variant="h1" style={{ textAlign: 'center' }}>{t('noResults')}</Text><Text muted>{t('noResultsHint')}</Text></View>
        <GenreSuggestions genres={genres.data} />
      </View> : <View style={{ paddingTop: 24, gap: 32 }}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="h2" accessibilityRole="header">{t('recentSearches')}</Text>
            {recent.length > 0 && <Button variant="ghost" size="sm" onPress={() => setRemoval('')}><Text variant="caption">{t('clearAll')}</Text></Button>}
          </View>
          {recent.length === 0 ? <Text muted>{t('noSearches')}</Text> : recent.map(value => <View key={value}
            style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line }}>
            <Button variant="ghost" style={{ flex: 1, justifyContent: 'flex-start', paddingHorizontal: 0, gap: 12 }} onPress={() => setInput(value)}>
              <Icon name="time-outline" size={18} color={colors['text-muted']} /><Text numberOfLines={1} style={{ flex: 1 }}>{value}</Text>
            </Button>
            <Button variant="ghost" size="icon" accessibilityLabel={`${t('removeSearch')} ${value}`} onPress={() => setRemoval(value)}>
              <Icon name="close" size={18} color={colors['text-muted']} />
            </Button>
          </View>)}
        </View>
        <GenreSuggestions genres={genres.data} />
      </View>} />
    <BrowseNavigation />
    <RemovalDialog open={removal !== null} onOpenChange={open => { if (!open) setRemoval(null); }}
      title={t(removal ? 'removeSearch' : 'clearAll')} description={removal || t('clearSearchesHint')} error={storageError}
      onRemove={() => {
        setStorageError(false);
        void (removal ? removeSearch(removal) : clearSearches()).then(() => setRemoval(null)).catch(() => setStorageError(true));
      }} />
  </SafeAreaView>;
}
