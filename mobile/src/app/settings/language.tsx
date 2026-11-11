import { useState } from 'react';
import { Check } from 'lucide-react-native';
import { SettingsLayout, SettingsRow } from '@/components/SettingsLayout';
import { Toast } from '@/components/ui/toast';
import { useSettings, updateSettings } from '@/storage/settings';
import { colors } from '@/theme';
import { t } from '@/i18n';
export default function LanguageScreen() {
  const settings = useSettings(); const [error, setError] = useState(false);
  return <SettingsLayout title={t('language')}>
    {(['system', 'id', 'en'] as const).map(language => <SettingsRow key={language} label={language === 'system' ? t('systemLanguage') : language === 'id' ? 'Indonesia' : 'English'}
      onPress={() => { setError(false); void updateSettings({ language }).catch(() => setError(true)); }}>{settings.language === language && <Check color={colors.brand} />}</SettingsRow>)}
    {error && <Toast message={t('storageError')} />}
  </SettingsLayout>;
}
