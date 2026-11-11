import { Languages, Database, Info } from 'lucide-react-native';
import { colors } from '@/theme';
import { useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Platform, View } from 'react-native';
import { SettingsLayout, SettingsRow, SettingsDivider } from '@/components/SettingsLayout';
import { Text } from '@/components/Text';
import { Switch } from '@/components/ui/switch';
import { Toast } from '@/components/ui/toast';
import { useSettings, updateSettings, type Settings } from '@/storage/settings';
import { t } from '@/i18n';
export default function SettingsScreen() {
  const settings = useSettings(); const [error, setError] = useState(false);
  const save = (value: Partial<Settings>) => { setError(false); void updateSettings(value).catch(() => setError(true)); };
  return <SettingsLayout title={t('settings')}>
    <Text variant="h2">{t('playback')}</Text>
    <SettingsRow label={t('autoplay')} hint={t('autoplayHint')}><Switch accessibilityLabel={t('autoplay')} value={settings.autoplayNext} onValueChange={autoplayNext => save({ autoplayNext })} /></SettingsRow>
    <SettingsRow label={t('resumeSetting')} hint={t('resumeHint')}><Switch accessibilityLabel={t('resumeSetting')} value={settings.resume} onValueChange={resume => save({ resume })} /></SettingsRow>
    {Platform.OS !== 'web' && <SettingsRow label={t('wifiOnly')} hint={t('wifiWaiting')}><Switch accessibilityLabel={t('wifiOnly')} value={settings.wifiOnly} onValueChange={wifiOnly => save({ wifiOnly })} /></SettingsRow>}
    <SettingsDivider /><Text variant="h2">{t('preferences')}</Text>
    <SettingsRow icon={<Languages size={24} color={colors['text-muted']} />} label={t('language')} hint={settings.language === 'system' ? t('systemLanguage') : settings.language === 'id' ? 'Indonesia' : 'English'} onPress={() => router.push('/settings/language')} />
    <SettingsRow icon={<Database size={24} color={colors['text-muted']} />} label={t('storage')} onPress={() => router.push('/settings/storage')} />
    <SettingsRow icon={<Info size={24} color={colors['text-muted']} />} label={t('about')} onPress={() => router.push('/settings/about')} />
    <View style={{ paddingTop: 16 }}><Text variant="caption" muted>AniStream {Constants.expoConfig?.version}</Text></View>
    {error && <Toast message={t('storageError')} />}
  </SettingsLayout>;
}
