import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Orientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEpisode, useResolvedSource, useSeries } from '@/api';
import { API_URL } from '@/api/client';
import { addHistory, useHistory, useHistoryHydrated } from '@/storage';
import { Text } from '@/components/Text';
import { EpisodeRow } from '@/components/EpisodeRow';
import { Button } from '@/components/ui/button';
import { SkeletonBox, SkeletonText } from '@/components/skeleton';
import { goBack } from '@/components/SeriesDetail';
import { colors } from '@/theme';
import { t } from '@/i18n';
import { NativePlayer } from './NativePlayer';
import { EmbedPlayer } from './EmbedPlayer';
import { PlayerButton } from './PlayerButton';

export function WatchScreen({ slug, previewNext = false }: { slug: string; previewNext?: boolean }) {
  const episode = useEpisode(slug);
  const series = useSeries(episode.data?.seriesSlug ?? '');
  const history = useHistory();
  const historyHydrated = useHistoryHydrated();
  const saved = history.find(item => item.episodeSlug === slug);
  const [position, setPosition] = useState<number | null>(null);
  const resume = position ?? (saved && saved.duration - saved.position > 30 ? saved.position : 0);
  const failedAttempt = useRef('');
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retry = () => {
    failedAttempt.current = '';
    setFailed(false);
    setIndex(0);
    setAttempt(value => value + 1);
    void episode.refetch();
  };
  const [picker, setPicker] = useState(false);
  const [toast, setToast] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = fullscreen || width > height;
  const sources = useMemo(() => [...(episode.data?.sources ?? [])].sort((a, b) => Number(a.kind === 'iframe') - Number(b.kind === 'iframe')), [episode.data]);
  const mirror = sources[index];
  const resolved = useResolvedSource(!failed && mirror?.kind === 'resolvable' ? mirror.url : '', attempt);
  const source = mirror?.kind === 'iframe' ? { type: 'iframe' as const, url: mirror.url } : resolved.data;
  const fail = useCallback(() => {
    const key = `${index}-${attempt}`;
    if (failedAttempt.current === key) return;
    failedAttempt.current = key;
    if (index + 1 < sources.length) {
      setToast(`${t('switchedServer')} ${sources[index + 1].label}`);
      setIndex(index + 1);
    } else {
      setFailed(true);
    }
  }, [sources, index, attempt]);
  useEffect(() => {
    if (!resolved.isError || failed) return;
    const timer = setTimeout(fail, 0);
    return () => clearTimeout(timer);
  }, [resolved.isError, failed, fail]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let previous: Orientation.OrientationLock | undefined;
    let active = true;
    void Orientation.getOrientationLockAsync().then(lock => {
      previous = lock;
      if (active) return Orientation.unlockAsync();
    }).catch(() => undefined);
    const subscription = Orientation.addOrientationChangeListener(event => {
      const orientation = event.orientationInfo.orientation;
      setFullscreen(orientation === Orientation.Orientation.LANDSCAPE_LEFT || orientation === Orientation.Orientation.LANDSCAPE_RIGHT);
    });
    return () => {
      active = false;
      subscription.remove();
      if (previous !== undefined) void Orientation.lockAsync(previous).catch(() => undefined);
    };
  }, []);
  const toggleFull = () => {
    setFullscreen(!full);
    if (Platform.OS !== 'web') void Orientation.lockAsync(full ? Orientation.OrientationLock.PORTRAIT_UP : Orientation.OrientationLock.LANDSCAPE).catch(() => undefined);
  };
  const navigate = useCallback((target: string | null | undefined) => {
    if (target) router.replace({ pathname: '/watch/[slug]', params: { slug: target } });
  }, []);
  const save = (current: number, duration: number) => {
    if (!episode.data || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(current)) return;
    setPosition(current);
    void addHistory({ episodeSlug: slug, seriesSlug: episode.data.seriesSlug ?? '',
      title: series.data?.title ?? episode.data.seriesTitle ?? episode.data.title,
      episode: series.data?.episodes.find(item => item.slug === slug)?.number ?? slug.match(/episode-(\d+(?:\.\d+)?)/)?.[1] ?? episode.data.title.match(/episode\s+(\d+)/i)?.[1] ?? '',
      poster: series.data?.image ?? saved?.poster ?? '', genres: series.data?.genres ?? saved?.genres,
      position: current, duration, updatedAt: Date.now() }).catch(() => setToast(t('storageError')));
  };
  const next = useCallback(() => navigate(episode.data?.nextSlug), [navigate, episode.data?.nextSlug]);
  const navigation = <View style={styles.row}>
    <PlayerButton icon="play-skip-back" label={t('previousEpisode')} disabled={!episode.data?.prevSlug} onPress={() => navigate(episode.data?.prevSlug)} />
    <PlayerButton icon="play-skip-forward" label={t('nextEpisode')} disabled={!episode.data?.nextSlug} onPress={next} />
  </View>;
  const chrome = <View pointerEvents="box-none" style={{ position: 'absolute', top: full ? Math.max(insets.top, 12) : 8, left: Math.max(insets.left, 12), right: Math.max(insets.right, 12), flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
    <PlayerButton icon="arrow-back" label={t('back')} onPress={goBack} />
    <View style={styles.row}>{navigation}<PlayerButton icon="server-outline" label={t('servers')} onPress={() => setPicker(value => !value)} />
      {source?.type !== 'iframe' && <PlayerButton icon={full ? 'contract' : 'expand'} label={t(full ? 'exitFullscreen' : 'fullscreen')} onPress={toggleFull} />}</View>
  </View>;
  const error = failed || episode.isError || (episode.isSuccess && !sources.length);
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: full ? 0 : insets.top }}>
    <Stack.Screen options={{ headerShown: false, orientation: 'all', navigationBarHidden: full, statusBarHidden: full }} />
    <StatusBar style="light" hidden={full} />
    <View style={{ width: '100%', height: full ? height : Math.max(230, width * 9 / 16), backgroundColor: '#000' }}>
      {episode.isPending ? <SkeletonBox height="100%" /> : error ? <View style={styles.error}>
        <Text variant="h2">{t('playbackError')}</Text>
        <View style={styles.row}><Button onPress={() => {
          retry();
        }}><Text>{t('retry')}</Text></Button><Button variant="secondary" onPress={goBack}><Text>{t('back')}</Text></Button></View>
      </View> : source && historyHydrated ? source.type === 'iframe' ? <><EmbedPlayer url={source.url} onError={fail} />{chrome}</> :
        <NativePlayer key={`${index}-${attempt}`} url={new URL(source.playUrl || source.url, `${API_URL}/`).href} type={source.type}
          resume={resume} onSave={save} onError={fail}
          onNext={episode.data?.nextSlug ? next : undefined} previewNext={previewNext}>{chrome}</NativePlayer>
        : <View style={styles.error}><ActivityIndicator color={colors.text} />{chrome}</View>}
      {picker && !error && <View style={styles.picker}>
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {sources.map((item, i) => <Button key={`${item.label}-${i}`} variant={i === index ? 'default' : 'secondary'} accessibilityState={{ selected: i === index }} onPress={() => {
            setPicker(false);
            setFailed(false);
            setIndex(i);
            setAttempt(value => value + 1);
          }}><Text>{i === index ? '✓ ' : ''}{item.label}</Text></Button>)}
        </ScrollView>
      </View>}
      {!!toast && <View accessibilityLiveRegion="polite" style={{ position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 8 }}><Text>{toast}</Text></View>}
    </View>
    {!full && <FlatList
      data={[...(series.data?.episodes ?? [])].sort((a, b) => Number(a.number) - Number(b.number))}
      keyExtractor={item => item.slug}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={<View style={{ paddingTop: 24, paddingBottom: 16, gap: 16 }}>
        {episode.isPending ? <SkeletonText lines={2} /> : <>
          <Text variant="caption" muted>{t('nowPlaying')}</Text>
          <Text variant="h2">{episode.data?.title}</Text>
          {!!episode.data?.seriesSlug && <Button variant="link" style={{ alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 0 }}
            onPress={() => router.replace({ pathname: '/series/[slug]', params: { slug: episode.data!.seriesSlug! } })}>
            <Text style={{ color: colors.accent, flexShrink: 1 }}>{episode.data.seriesTitle}</Text>
          </Button>}
          {navigation}
          <Text variant="h2">{t('episodesHeading')}</Text>
          {series.isError && <Button variant="secondary" onPress={() => { void series.refetch(); }}><Text>{t('retry')}</Text></Button>}
          {series.isPending && <><SkeletonBox height={80} /><SkeletonBox height={80} /></>}
        </>}
      </View>}
      renderItem={({ item }) => <EpisodeRow episode={item} seriesSlug={episode.data?.seriesSlug ?? ''}
        seriesTitle={series.data?.title ?? ''} current={item.slug === slug} onPress={() => navigate(item.slug)} />}
    />}

  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  picker: { position: 'absolute', top: 64, right: 16, bottom: 16, minWidth: 160, padding: 12, backgroundColor: colors.surface, borderRadius: 10 },
});
