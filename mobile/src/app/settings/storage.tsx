import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Image } from 'expo-image';
import { SettingsLayout, SettingsRow } from '@/components/SettingsLayout';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { RemovalDialog } from '@/components/RemovalDialog';
import { clearHistory, clearBookmarks, clearSearches } from '@/storage';
import { colors } from '@/theme';
import { t, type TranslationKey } from '@/i18n';
export default function StorageScreen() {
  const [selected, setSelected] = useState<TranslationKey | null>(null);
  const [error, setError] = useState(false); const [busy, setBusy] = useState(false); const [toast, setToast] = useState('');
  const choose = (key: TranslationKey) => { setError(false); setToast(''); setSelected(key); };
  const clear = async () => {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      if (selected === 'clearCache') {
        if (Platform.OS === 'web') throw new Error('Browser cache');
        const results = await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
        if (results.some(result => !result)) throw new Error('Cache clear failed');
      } else if (selected === 'clearHistory') await clearHistory();
      else if (selected === 'clearList') await clearBookmarks();
      else if (selected === 'clearSearchHistory') await clearSearches();
      setSelected(null); setToast(t('cleared'));
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <SettingsLayout title={t('storage')}>
    <View style={{ gap: 8 }}><Text variant="h1">{t('storageTitle')}</Text><Text muted>{t('storageHint')}</Text></View>
    <View style={{ backgroundColor: colors.card, padding: 20, borderRadius: 10, gap: 12, marginTop: 8 }}><Text variant="caption" muted>{t('imageCache')}</Text><Text variant="h2">{t('cacheUnknown')}</Text></View>
    <Text variant="caption" muted>{t(Platform.OS === 'web' ? 'cacheUnsupported' : 'cacheHint')}</Text>
    {Platform.OS !== 'web' && <Button variant="outline" style={{ alignSelf: 'center', borderRadius: 24 }} onPress={() => choose('clearCache')}><Text variant="title">{t('clearCache')}</Text></Button>}
    <Text variant="h2" style={{ marginTop: 24 }}>{t('localData')}</Text>
    {(['clearHistory', 'clearSearchHistory', 'clearList'] as const).map(key => <SettingsRow destructive key={key} label={t(key)} onPress={() => choose(key)} />)}
    {!!toast && <Toast message={toast} />}
    <RemovalDialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }} title={selected === 'clearHistory' ? t('clearHistoryTitle') : t('clearDataTitle')} description={selected === 'clearHistory' ? t('clearHistoryBody') : t('clearDataHint')} error={error} actionLabel={selected ? t(selected) : t('remove')} onRemove={() => { void clear(); }} />
  </SettingsLayout>;
}
