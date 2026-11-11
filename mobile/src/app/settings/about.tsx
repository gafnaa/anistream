import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { SettingsLayout, SettingsRow, SettingsDivider } from '@/components/SettingsLayout';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { t } from '@/i18n';
export default function AboutScreen() {
  const [error, setError] = useState(false);
  const open = (path: string) => { setError(false); void Linking.openURL(`https://github.com/gafnaa/anistream${path}`).catch(() => setError(true)); };
  return <SettingsLayout title={t('about')}>
    <View style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
      <Image source={require('../../../assets/images/icon.png')} style={{ width: 88, height: 88, borderRadius: 24, marginBottom: 16 }} />
      <Text variant="display">AniStream</Text><Text variant="caption" muted>{t('version')} {Constants.expoConfig?.version}</Text>
      <Button variant="outline" style={{ marginTop: 24, borderRadius: 24 }} onPress={() => open('/releases')}><Text variant="title">{t('updates')}</Text></Button>
    </View>
    <View><SettingsRow label={t('licences')} onPress={() => open('/blob/main/docs/design/SOURCES.md')} /><SettingsDivider />
    <SettingsRow label={t('source')} onPress={() => open('')} /><SettingsDivider /></View>
    <Text variant="title">{t('contentDisclaimer')}</Text><Text muted>{t('disclaimer')}</Text>
    {error && <Toast message={t('shareError')} />}
  </SettingsLayout>;
}
