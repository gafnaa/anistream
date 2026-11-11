import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from './Screen';
import { Text } from './Text';
import { ActionButton } from './ActionButton';
import { t, type TranslationKey } from '@/i18n';
export function RoutePlaceholder({ title }: { title: TranslationKey }) {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <Screen title={t(title)} preview={false}><Text>{slug}</Text><Text muted>{t('routePreview')}</Text>
    <ActionButton label={t('back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
  </Screen>;
}
