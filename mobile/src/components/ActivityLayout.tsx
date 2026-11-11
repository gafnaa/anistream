import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AmbientBackground } from './AmbientBackground';
import { Text } from './Text';
import Icon from './Icon';
import { Button } from './ui/button';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function ActivityLayout({ children }: PropsWithChildren) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}><AmbientBackground />{children}</SafeAreaView>;
}
export function ActivityEmpty({ history = false }: { history?: boolean }) {
  return <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: history ? 160 : 48, gap: 24 }}>
    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><Icon name={history ? 'time' : 'person'} size={36} color={colors.text} /></View>
    <Text variant="h1" style={{ textAlign: 'center', maxWidth: 300 }}>{t(history ? 'historyEmpty' : 'listEmpty')}</Text>
    <Text muted style={{ textAlign: 'center' }}>{t(history ? 'historyEmptyHint' : 'listEmptyHint')}</Text>
    <Button onPress={() => router.navigate('/(tabs)/discover')} style={{ marginTop: 16, borderRadius: 24 }}><Text variant="title">{t('browseAnime')}</Text></Button>
  </View>;
}
export function dayLabel(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (timestamp >= today.getTime()) return t('today');
  if (timestamp >= yesterday.getTime()) return t('yesterday');
  return date.toLocaleDateString(t('today') === 'Hari ini' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  return minutes < 1 ? t('justNow') : minutes < 60 ? `${minutes} ${t('agoMinutes')}` : `${Math.floor(minutes / 60)} ${t('agoHours')}`;
}
