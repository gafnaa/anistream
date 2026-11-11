import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { spacing } from '@/theme';
import { t } from '@/i18n';
export default function NotFound() {
  return <Screen title={t('notFound')} preview={false}><Text muted>{t('notFoundBody')}</Text>
    <Link href="/" style={{ minHeight: 48, paddingVertical: spacing.lg }}><Text>{t('backHome')}</Text></Link>
  </Screen>;
}
