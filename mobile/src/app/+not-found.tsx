import { router } from 'expo-router';
import { View } from 'react-native';
import { AmbientBackground } from '@/components/AmbientBackground';
import { RecoveryState } from '@/components/RecoveryState';
import { BrowseNavigation } from '@/components/BrowseNavigation';
import { t } from '@/i18n';
export default function NotFound() {
  return <View style={{ flex: 1 }}><AmbientBackground />
    <RecoveryState kind="missing" title={t('seriesNotFound')} description={t('notFoundBody')}
      label={t('search')} action={() => router.replace('/search')} secondaryLabel={t('backHome')} secondary={() => router.replace('/')} />
    <BrowseNavigation />
  </View>;
}
