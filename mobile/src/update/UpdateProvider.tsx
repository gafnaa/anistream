import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppLatest } from '@/api';
import { API_URL, withApiKey } from '@/api/client';
import type { AppRelease } from '@/api/types';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/Text';
import { colors } from '@/theme';
import { t } from '@/i18n';
import { compareVersions } from './version';

export const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
const dismissalKey = 'anistream.update.dismissed.v1';
const UpdateContext = createContext<{ check: () => Promise<void>; checking: boolean; latest: boolean; error: boolean }>({ check: async () => {}, checking: false, latest: false, error: false });
export const useAppUpdate = () => useContext(UpdateContext);

export function UpdateProvider({ ready, children }: { ready: boolean; children: ReactNode }) {
  const query = useAppLatest();
  const started = useRef(false);
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [checking, setChecking] = useState(false);
  const [latest, setLatest] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [error, setError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const apkUrl = withApiKey(`${API_URL}/api/app/apk`);
  const refetch = query.refetch;

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    void (async () => {
      const result = await refetch();
      if (!result.data || result.error || compareVersions(result.data.version, currentVersion) <= 0) return;
      const dismissed = await AsyncStorage.getItem(dismissalKey).catch(() => null);
      if (dismissed !== result.data.version) setRelease(result.data);
    })();
  }, [ready, refetch]);

  const check = async () => {
    setChecking(true); setCheckError(false); setLatest(false);
    try {
      const result = await refetch();
      if (result.error || !result.data) throw result.error;
      if (compareVersions(result.data.version, currentVersion) > 0) {
        setError(false); setStorageError(false); setRelease(result.data);
      } else setLatest(true);
    } catch { setCheckError(true); }
    finally { setChecking(false); }
  };
  const dismiss = async () => {
    if (progress !== null || !release) return;
    try {
      await AsyncStorage.setItem(dismissalKey, release.version);
      setRelease(null); setError(false); setStorageError(false);
    } catch { setStorageError(true); }
  };
  const openBrowser = async () => {
    try { await Linking.openURL(apkUrl); } catch { setError(true); }
  };
  const install = async () => {
    if (Platform.OS !== 'android') { await openBrowser(); return; }
    setError(false); setProgress(0);
    try {
      if (!FileSystem.cacheDirectory || !release) throw new Error('Cache unavailable');
      const file = `${FileSystem.cacheDirectory}anistream-update.apk`;
      await FileSystem.deleteAsync(file, { idempotent: true });
      const download = FileSystem.createDownloadResumable(apkUrl, file, {}, event => {
        setProgress(event.totalBytesExpectedToWrite > 0 ? Math.min(1, event.totalBytesWritten / event.totalBytesExpectedToWrite) : 0);
      });
      const result = await download.downloadAsync();
      if (!result || result.status !== 200) throw new Error('Download failed');
      const uri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: uri, type: 'application/vnd.android.package-archive', flags: 1,
      });
    } catch { setError(true); }
    finally { setProgress(null); }
  };
  return <UpdateContext.Provider value={{ check, checking, latest, error: checkError }}>
    {children}
    <AlertDialog open={!!release} onOpenChange={open => { if (!open) void dismiss(); }}>
      <AlertDialogContent style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 24, gap: 24, maxHeight: '90%' }}>
        <AlertDialogTitle className="text-2xl">{t('updateAvailable')}</AlertDialogTitle>
        <AlertDialogDescription>v{release?.version} · {((release?.size ?? 0) / 1024 / 1024).toFixed(1)} MB</AlertDialogDescription>
        <ScrollView style={{ maxHeight: 240, flexShrink: 1 }}><Text>{release?.notes || t('updateNoNotes')}</Text></ScrollView>
        {progress !== null && <View style={{ gap: 8 }}>
          <Text accessibilityLiveRegion="polite">{t('updateDownloading')} {Math.round(progress * 100)}%</Text>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 6, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${progress * 100}%`, backgroundColor: colors.brand }} />
          </View>
        </View>}
        {storageError && <Text accessibilityRole="alert">{t('storageError')}</Text>}
        {error && <View style={{ gap: 12 }}><Text accessibilityRole="alert">{t('updateError')}</Text>
          <Button variant="outline" onPress={() => { void openBrowser(); }}><Text>{t('updateBrowser')}</Text></Button></View>}
        <Button disabled={progress !== null} onPress={() => { void install(); }}><Text style={{ color: '#FFFFFF' }}>{t('updateNow')}</Text></Button>
        <Button variant="ghost" disabled={progress !== null} onPress={() => { void dismiss(); }}><Text>{t('updateLater')}</Text></Button>
      </AlertDialogContent>
    </AlertDialog>
  </UpdateContext.Provider>;
}
