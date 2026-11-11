import { WifiOff } from 'lucide-react-native';
import { colors } from '@/theme';
import { RecoveryState } from './RecoveryState';
import { router } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from './ui/toast';
import { t } from '@/i18n';
export function Connectivity() {
  const offline = useOffline(); const insets = useSafeAreaInsets();
  useEffect(() => { onlineManager.setOnline(!offline); }, [offline]);
  return offline ? <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 88, left: 16, right: 16 }}><Toast icon={<WifiOff size={24} color={colors['text-muted']} />} message={t('offlineBanner')} /></View> : null;
}

const subscribeBrowser = (listener: () => void) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => undefined;
  window.addEventListener('online', listener); window.addEventListener('offline', listener);
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); };
};
const browserOnline = () => Platform.OS !== 'web' || typeof navigator === 'undefined' || navigator.onLine;
export function useOffline() {
  const network = useNetInfo();
  const online = useSyncExternalStore(subscribeBrowser, browserOnline, () => true);
  return Platform.OS === 'web' ? !online : network.isConnected === false || network.isInternetReachable === false;
}
export function OfflineState({ retry }: { retry: () => void }) {
  return <RecoveryState title={t('offlineTitle')} description={t('homeErrorBody')} label={t('retry')} action={retry} secondaryLabel={t('backHome')} secondary={() => router.replace('/')} />;
}
