import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Download, MoreHorizontal, Pause, Play, RotateCw, Settings, Wifi } from 'lucide-react-native';
import { Image } from 'expo-image';
import { SettingsLayout } from './SettingsLayout';
import { Button } from './ui/button';
import { Text } from './Text';
import { RemovalDialog } from './RemovalDialog';
import { downloads, isDownloadPlaying, useDownloads, useDownloadsError, useDownloadsHydrated } from '@/downloads/store';
import { pauseDownload, removeDownload, storageCapacity } from '@/downloads/engine';
import type { DownloadRecord } from '@/downloads/queue';
import { formatBytes } from '@/downloads/format';
import { useSettings } from '@/storage/settings';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function DownloadsScreen({ previewRecords, initialQueue = false }: { previewRecords?: DownloadRecord[]; initialQueue?: boolean }) {
  const persistenceError = useDownloadsError();
  const stored = useDownloads(); const hydrated = useDownloadsHydrated(); const records = previewRecords ?? stored;
  const [queue, setQueue] = useState(initialQueue); const [removal, setRemoval] = useState<DownloadRecord | null>(null);
  const [menu, setMenu] = useState<DownloadRecord | null>(null);
  const [error, setError] = useState(false); const [playing, setPlaying] = useState(false);
  const [capacity, setCapacity] = useState<{ free: number; total: number } | null>(null);
  const settings = useSettings();
  useEffect(() => { void storageCapacity().then(setCapacity).catch(() => undefined); }, [stored]);
  const ready = records.filter(item => item.status === 'ready'); const waiting = records.filter(item => item.status !== 'ready');
  const total = records.reduce((sum, item) => sum + item.bytes, 0);
  const choose = (item: DownloadRecord) => { setError(false); setPlaying(isDownloadPlaying(item.slug)); setRemoval(item); };
  const row = (item: DownloadRecord) => <DownloadRow key={item.slug} item={item} onManage={() => setMenu(item)} onError={() => setError(true)} />;
  return <SettingsLayout title={t('downloads')}>
    <Button variant="ghost" size="icon" accessibilityLabel={t('settings')} onPress={() => router.push('/settings/storage')}
      style={{ position: 'absolute', right: 24, top: 40 }}><Settings size={24} color={colors.text} /></Button>
    {Platform.OS === 'web' && !previewRecords ? <Text muted>{t('webDownloads')}</Text> : <>
      {!hydrated && !previewRecords && <Text muted>{t('loading')}</Text>}
      {(error || persistenceError) && <Text accessibilityRole="alert">{t('storageError')}</Text>}
      {!!records.length && <>
        {!queue && <View style={{ padding: 16, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, gap: 10 }}>
          <Text muted variant="caption">{t('deviceStorage')}</Text>
          <Text variant="h2">{capacity ? `${formatBytes(capacity.total - capacity.free)} / ${formatBytes(capacity.total)}` : formatBytes(total)}</Text>
          {capacity && <Progress bytes={capacity.total - capacity.free} total={capacity.total} />}
          <Text muted variant="caption">{formatBytes(total)} {t('downloads').toLowerCase()}{capacity ? ` · ${formatBytes(capacity.free)} ${t('availableStorage')}` : ''}</Text>
        </View>}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[false, true].map(value => <Button key={String(value)} variant="outline" aria-pressed={queue === value} accessibilityState={{ selected: queue === value }} onPress={() => setQueue(value)}
            style={{ flex: 1, borderRadius: 24, borderColor: queue === value ? colors.brand : colors.line, backgroundColor: queue === value ? '#F43F5E1F' : colors.card }}>
            <Text variant="caption" muted={queue !== value}>{t(value ? 'downloadQueue' : 'downloadReady')}{value ? ` · ${waiting.length}` : ''}</Text>
          </Button>)}
        </View>
      </>}
      {queue ? <>
        {settings.wifiOnly && <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Wifi size={20} color={colors['text-muted']} /><Text muted variant="caption">{t('wifiOnly')}</Text></View>}
        {waiting.map(row)}
        {!waiting.length && <Text muted>{t('downloadEmpty')}</Text>}
      </> : records.length ? <>
        {waiting.some(item => item.status === 'downloading') && <><Text variant="h2">{t('downloading')}</Text>{waiting.filter(item => item.status === 'downloading').map(row)}</>}
        <View style={{ gap: 8 }}><Text variant="h2">{t('offlineReady')}</Text><Text muted>{ready.length} {t('episodesLabel')} · {formatBytes(ready.reduce((sum, item) => sum + item.bytes, 0))}</Text></View>
        {ready.map(row)}
      </> : (hydrated || previewRecords) && <>
        <Text muted>{t('downloadEmptyLead')}</Text>
        <View style={{ paddingHorizontal: 16, paddingTop: 80, gap: 40 }}>
          <View style={{ alignSelf: 'center', padding: 28, backgroundColor: colors.card, borderRadius: 60 }}><Download size={44} color={colors.text} /></View>
          <Text variant="h1">{t('downloadEmpty')}</Text><Text muted>{t('downloadEmptyHint')}</Text>
          <Button style={{ alignSelf: 'flex-start', borderRadius: 24, marginTop: 12 }} onPress={() => router.replace('/discover')}><Text>{t('browseAnime')}</Text></Button>
        </View>
      </>}
    </>}
    <Modal visible={!!menu} transparent animationType="slide" onRequestClose={() => setMenu(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => setMenu(null)} style={{ position: 'absolute', inset: 0 }} />
        <View accessibilityViewIsModal style={{ padding: 24, paddingBottom: 40, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 16 }}>
          <Text variant="h2">{menu?.seriesTitle}</Text><Text muted>{t('episodeLabel')} {menu?.episode}</Text>
          <Button variant="destructive" onPress={() => { if (menu) choose(menu); setMenu(null); }}><Text>{t('remove')}</Text></Button>
          <Button variant="ghost" onPress={() => setMenu(null)}><Text>{t('cancel')}</Text></Button>
        </View>
      </View>
    </Modal>
    <RemovalDialog open={!!removal} onOpenChange={open => { if (!open) setRemoval(null); }} title={t('deleteDownload')}
      description={t(playing ? 'playingDownload' : 'deleteDownloadHint')} error={error} actionLabel={t('remove')} onRemove={() => {
        if (!removal) return;
        if (isDownloadPlaying(removal.slug)) { setPlaying(true); return; }
        void removeDownload(removal).then(() => setRemoval(null)).catch(() => setError(true));
      }} />
  </SettingsLayout>;
}
function Progress({ bytes, total }: { bytes: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round(bytes / total * 100)) : 0;
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: 'hidden' }}><View style={{ width: `${percent}%`, height: 4, backgroundColor: colors.brand }} /></View>;
}
function DownloadRow({ item, onManage, onError }: { item: DownloadRecord; onManage: () => void; onError: () => void }) {
  const network = useNetInfo();
  const settings = useSettings();
  const waitingLabel = network.isConnected === false || network.isInternetReachable === false ? 'networkWaiting' : settings.wifiOnly && network.type !== 'wifi' ? 'wifiWaiting' : 'downloadQueued';
  const ready = item.status === 'ready'; const active = item.status === 'downloading';
  const percent = item.total > 0 ? Math.min(100, Math.round(item.bytes / item.total * 100)) : 0;
  const pausable = active || item.status === 'queued';
  const operation = () => { void (pausable ? pauseDownload(item.slug) : downloads.resume(item.slug)).catch(onError); };
  return <View style={{ gap: 12, padding: ready ? 0 : 12, borderRadius: 12, backgroundColor: ready ? 'transparent' : colors.card, borderWidth: ready ? 0 : 1, borderColor: colors.line }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {ready ? <Button variant="ghost" accessibilityLabel={`${t('play')} ${item.seriesTitle} ${item.episode}`}
        onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug: item.slug } })}
        style={{ width: 128, height: 72, padding: 0, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surface }}>
        <Image source={item.posterUri || item.poster} contentFit="cover" style={{ position: 'absolute', inset: 0 }} />
        <View style={{ backgroundColor: '#13151C99', borderRadius: 24, padding: 6 }}><Play size={24} color={colors.text} /></View>
      </Button> : <Image source={item.posterUri || item.poster} contentFit="cover" style={{ width: 78, height: 58, borderRadius: 6, backgroundColor: colors.surface }} />}
      <View style={{ flex: 1, gap: 6 }}><Text variant="title" numberOfLines={2}>{item.seriesTitle}</Text><Text muted variant="caption">{t('episodeLabel')} {item.episode}{!ready ? ` · ${item.quality}` : ''}</Text>{ready && <Text muted variant="caption">{item.quality} · {formatBytes(item.bytes)}</Text>}</View>
      <Button variant="ghost" size="icon" accessibilityLabel={t(ready ? 'manageDownload' : pausable ? 'downloadPause' : item.status === 'failed' ? 'retry' : 'downloadResume')} onPress={ready ? onManage : operation}>
        {ready ? <MoreHorizontal size={24} color={colors['text-muted']} /> : pausable ? <Pause size={24} color={colors.text} /> : item.status === 'failed' ? <RotateCw size={24} color={colors.text} /> : <Play size={24} color={colors.text} />}
      </Button>
    </View>
    {!ready && <>
      <Progress bytes={item.bytes} total={item.total} />
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}><Text muted={item.status !== 'failed'} variant="caption" style={[{ flex: 1, flexShrink: 1 }, item.status === 'failed' ? { color: colors.accent } : undefined]}>
        {item.status === 'failed' ? t('downloadFailed') : `${active ? `${percent}%` : t(item.status === 'paused' ? 'downloadPaused' : waitingLabel)} · ${formatBytes(item.bytes)} / ${item.total ? formatBytes(item.total) : '?'}`}
      </Text>{active && item.eta !== undefined && <Text muted variant="caption" style={{ flexShrink: 1, textAlign: 'right' }}>{item.eta >= 60 ? `${Math.ceil(item.eta / 60)} ${t('etaMinutes')}` : `${item.eta} ${t('etaSeconds')}`}</Text>}</View>
    </>}
  </View>;
}
