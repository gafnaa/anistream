import { useLocalSearchParams, router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { colors } from '@/theme';
import { View } from 'react-native';
import { useBrowse } from '@/api';
import { CatalogueScreen } from '@/components/CatalogueScreen';
import { quickFilters } from '@/components/CatalogueControls';
import { Screen } from '@/components/Screen';
import { BrowseNavigation } from '@/components/BrowseNavigation';
import { Row } from '@/components/Row';
import { PosterCard } from '@/components/PosterCard';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

function Catalogue() {
  const popular = useBrowse({ order: 'popular' });
  const completed = useBrowse({ status: 'completed' });
  const latest = useBrowse({ order: 'update' });
  return <View style={{ flex: 1 }}>
    <Screen title="AniStream" preview={false}>
      <Button variant="ghost" style={{ position: 'absolute', top: 16, right: 16 }} accessibilityLabel={t('search')} onPress={() => router.push('/search')}><Search size={24} color={colors.text} /></Button>
      {[{ title: t('continueExploring'), query: latest }, { title: t('readyToBinge'), query: completed }, { title: t('chooseYourMood'), query: popular }].map(({title,query}) => <View key={title} style={{ marginHorizontal: -24 }}>
        <Row title={title} items={query.data?.pages.flatMap(page => page.items) ?? []} itemKey={item => item.slug}
          loading={query.isPending} error={query.isError} retry={() => void query.refetch()} renderItem={item => <PosterCard item={item} />} />
      </View>)}
    </Screen>
    <BrowseNavigation />
  </View>;
}
export default function Browse() {
  const { status, type } = useLocalSearchParams<{ status?: string; type?: string }>();
  const filter = quickFilters.find(item => status ? item.params.status === status : type ? item.params.type === type : false);
  if (!status && !type) return <Catalogue />;
  return <CatalogueScreen key={`${status}:${type}`} title={filter ? t(filter.label) : t('discover')} params={{ status, type }} />;
}
