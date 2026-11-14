import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Download } from 'lucide-react-native';
import { useDownloadOptions } from '@/api/downloads';
import { downloads, useDownloads } from '@/downloads/store';
import { downloadFileUri } from '@/downloads/engine';
import { formatBytes } from '@/downloads/format';
import { useSettings, updateSettings } from '@/storage/settings';
import { colors } from '@/theme';
import { t } from '@/i18n';
import { Text } from './Text';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
export type DownloadMetadata = { slug: string; seriesSlug: string; seriesTitle: string; episode: string; poster: string };
export function DownloadButton({ metadata }: { metadata: DownloadMetadata }) {
  if (metadata.slug.startsWith('tm~')) return null;
  if (Platform.OS === 'web') return null;
  return <NativeDownloadButton metadata={metadata} />;
}
function NativeDownloadButton({ metadata }: { metadata: DownloadMetadata }) {
  const records = useDownloads();
  const exists = records.some(item => item.slug === metadata.slug);
  const [open, setOpen] = useState(false);
  return <View style={{ alignItems: 'center' }}>
    <Button variant="ghost" size="icon" disabled={exists}
      accessibilityLabel={t(exists ? 'downloadAdded' : 'downloadEpisode')} onPress={() => setOpen(true)}>
      <Download size={24} color={colors.text} />
    </Button>
    <DownloadQualitySheet open={open} onClose={() => setOpen(false)} metadata={metadata} />
  </View>;
}
export function DownloadQualitySheet({ open, onClose, metadata, previewOptions }: {
  open: boolean; onClose: () => void; metadata: DownloadMetadata;
  previewOptions?: { quality: string; size: number; url: string }[];
}) {
  const query = useDownloadOptions(previewOptions ? '' : open ? metadata.slug : '');
  const options = previewOptions ?? query.data?.options ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const choice = options.find(item => item.quality === selected) ?? options.find(item => item.quality === '720p') ?? options[0];
  const settings = useSettings();
  const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets(); const { height } = useWindowDimensions();
  const start = async () => {
    if (!choice || busy || Platform.OS === 'web') return;
    setBusy(true); setError(false);
    try {
      await downloads.add({ ...metadata, title: query.data?.episode.title ?? metadata.seriesTitle, url: choice.url,
        quality: choice.quality, total: choice.size, fileUri: downloadFileUri(metadata.slug), status: 'queued', bytes: 0 });
      onClose();
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={onClose} style={{ position: 'absolute', inset: 0 }} />
      <ScrollView accessibilityViewIsModal style={{ flexGrow: 0, maxHeight: height * 0.9, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 24, paddingBottom: Math.max(24, insets.bottom), gap: 16 }}>
        <View style={{ width: 40, height: 4, backgroundColor: colors.line, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
        <Text variant="h1">{t('downloadEpisode')}</Text>
        <Text muted>{metadata.seriesTitle} · {t('episodeLabel')} {metadata.episode}</Text>
        {options.map(item => <Button key={item.quality} variant="ghost" aria-pressed={choice === item} accessibilityState={{ selected: choice === item }} onPress={() => setSelected(item.quality)}
          style={{ height: 'auto', minHeight: 66, padding: 16, justifyContent: 'flex-start', backgroundColor: choice === item ? '#F43F5E14' : colors.card, borderWidth: 1, borderColor: choice === item ? colors.brand : 'transparent', borderRadius: 12 }}>
          <View style={{ flex: 1, gap: 4 }}><Text variant="title">{item.quality}</Text><Text variant="caption" muted>{t(item.quality === '720p' ? 'qualityRecommended' : item.quality === '1080p' ? 'qualityBest' : 'qualityCompact')} · {item.size ? `±${formatBytes(item.size)}` : t('cacheUnknown')}</Text></View>
          {choice === item && <Check size={24} color={colors.text} />}
        </Button>)}
        {!previewOptions && query.isPending && <Text muted>{t('loading')}</Text>}
        {!previewOptions && query.isError && <Button onPress={() => void query.refetch()}><Text>{t('retry')}</Text></Button>}
        {!previewOptions && query.isSuccess && !options.length && <Text muted>{t('downloadUnavailable')}</Text>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, minHeight: 56 }}><Text>{t('wifiOnly')}</Text>
          <Switch accessibilityLabel={t('wifiOnly')} value={settings.wifiOnly} onValueChange={wifiOnly => { void updateSettings({ wifiOnly }).catch(() => setError(true)); }} /></View>
        {error && <Text accessibilityRole="alert">{t('storageError')}</Text>}
        <Button disabled={!choice || busy || Platform.OS === 'web'} style={{ alignSelf: 'flex-start', borderRadius: 24, marginTop: 8 }} onPress={() => void start()}><Text>{t('startDownload')}</Text></Button>
        <Text variant="caption" muted>{t('sizeEstimate')}</Text>
      </ScrollView>
    </View>
  </Modal>;
}
