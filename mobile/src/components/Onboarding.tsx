import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ActivityLayout } from './ActivityLayout';
import { Text } from './Text';
import { Button } from './ui/button';
import { Toast } from './ui/toast';
import { SkeletonBox } from './skeleton';
import { useHome } from '@/api';
import { updateSettings } from '@/storage/settings';
import { colors } from '@/theme';
import { t } from '@/i18n';
export function Onboarding() {
  const home = useHome(); const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  const finish = async () => {
    if (busy) return;
    setBusy(true); setError(false);
    try { await updateSettings({ onboarded: true }); } catch { setError(true); } finally { setBusy(false); }
  };
  const artwork = [...(home.data?.trending ?? []), ...(home.data?.ongoing ?? [])].filter(item => item.image).slice(0, 3);
  return <ActivityLayout><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 48, gap: 32 }}>
    <Text variant="h1">AniStream</Text>
    <View style={{ flexDirection: 'row', gap: 14, height: 188, paddingTop: 8 }}>
      {[0, 1, 2].map(index => <View key={index} style={{ flex: 1, marginTop: index === 1 ? 20 : 0 }}>
        {artwork[index] ? <Image source={artwork[index].image} accessibilityLabel={artwork[index].title} contentFit="cover" style={{ width: '100%', aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: colors.card }} /> : <SkeletonBox height={156} />}
      </View>)}
    </View>
    <Text variant="display">{t('onboardTitle')}</Text><Text muted>{t('onboardHint')}</Text>
    <View style={{ flex: 1, minHeight: 48 }} />
    {error && <Toast message={t('storageError')} />}
    <Button disabled={busy} style={{ alignSelf: 'center', borderRadius: 24 }} onPress={() => { void finish(); }}><Text variant="title">{t('onboardStart')}</Text></Button>
    <Button disabled={busy} variant="secondary" style={{ alignSelf: 'center', borderRadius: 24 }} onPress={() => { void finish(); }}><Text muted>{t('skip')}</Text></Button>
  </ScrollView></ActivityLayout>;
}
