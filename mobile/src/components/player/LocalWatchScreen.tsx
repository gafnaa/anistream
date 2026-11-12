import { useCallback, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativePlayer } from './NativePlayer';
import { PlayerButton } from './PlayerButton';
import { Text } from '../Text';
import { Button } from '../ui/button';
import { goBack } from '../SeriesDetail';
import { addHistory, useHistory, useHistoryHydrated } from '@/storage';
import { useSettings } from '@/storage/settings';
import { setDownloadPlaying } from '@/downloads/store';
import type { DownloadRecord } from '@/downloads/queue';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function LocalWatchScreen({ item }: { item: DownloadRecord }) {
  const settings = useSettings(); const history = useHistory(); const hydrated = useHistoryHydrated();
  const saved = history.find(record => record.episodeSlug === item.slug);
  const [error, setError] = useState(false); const [saveError, setSaveError] = useState(false); const [attempt, setAttempt] = useState(0);
  const insets = useSafeAreaInsets(); const { width, height } = useWindowDimensions(); const [expanded, setExpanded] = useState(false);
  const full = expanded || width > height;
  const fail = useCallback(() => setError(true), []);
  useEffect(() => { setDownloadPlaying(item.slug, true); return () => setDownloadPlaying(item.slug, false); }, [item.slug]);
  const save = (position: number, duration: number) => {
    if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;
    void addHistory({ episodeSlug: item.slug, seriesSlug: item.seriesSlug, title: item.seriesTitle, episode: item.episode,
      poster: item.posterUri || item.poster, genres: saved?.genres, position, duration, updatedAt: Date.now() }).catch(() => setSaveError(true));
  };
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: full ? 0 : insets.top }}>
    <Stack.Screen options={{ headerShown: false, orientation: 'all', statusBarHidden: full, navigationBarHidden: full }} />
    {!full && <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}><PlayerButton icon="arrow-back" label={t('back')} onPress={goBack} /><Text variant="title" style={{ flex: 1 }}>{item.seriesTitle}</Text></View>}
    <View style={{ width, height: full ? height : width * 9 / 16, backgroundColor: '#000' }}>
      {error ? <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center', alignItems: 'center' }}><Text>{t('playbackError')}</Text><Button onPress={() => { setAttempt(value => value + 1); setError(false); }}><Text>{t('retry')}</Text></Button><Button variant="secondary" onPress={goBack}><Text>{t('back')}</Text></Button></View> : hydrated && <NativePlayer key={attempt} url={item.fileUri} type="mp4" resume={settings.resume ? saved?.position ?? 0 : 0} onSave={save} onError={fail} seriesTitle={item.seriesTitle} episodeNumber={Number(item.episode) || undefined}
        fullscreen={full} onToggleFullscreen={() => setExpanded(!full)}>
        <View style={{ position: 'absolute', left: Math.max(12, insets.left), right: Math.max(12, insets.right), top: Math.max(8, insets.top), flexDirection: 'row', justifyContent: 'space-between' }}>
          {full ? <PlayerButton icon="arrow-back" label={t('back')} onPress={goBack} /> : <View />}
        </View>
      </NativePlayer>}
    </View>
    {!full && <View style={{ padding: 24, gap: 16 }}><Text variant="h2">{item.title}</Text><Text muted>{t('episodeLabel')} {item.episode} · {item.quality} · {t('offlineReady')}</Text>
      {!!item.posterUri && <Image source={item.posterUri} style={{ width: 128, height: 72, borderRadius: 6 }} />}
      {saveError && <Text accessibilityRole="alert">{t('storageError')}</Text>}
    </View>}
  </View>;
}
