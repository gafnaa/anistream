import { useLocalSearchParams } from 'expo-router';
import { CatalogueScreen } from '@/components/CatalogueScreen';
import { quickFilters } from '@/components/CatalogueControls';
import { t } from '@/i18n';

export default function Browse() {
  const { status, type } = useLocalSearchParams<{ status?: string; type?: string }>();
  const filter = quickFilters.find(item => status ? item.params.status === status : type ? item.params.type === type : false);
  return <CatalogueScreen key={`${status}:${type}`} title={filter ? t(filter.label) : t('discover')} params={{ status, type }} />;
}
