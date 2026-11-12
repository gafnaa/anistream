import '../../global.css';
import { UpdateProvider } from '@/update/UpdateProvider';
import { startDownloadEngine } from '@/downloads/engine';
import { PortalHost } from '@rn-primitives/portal';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { RecoveryState } from '@/components/RecoveryState';
import { ActivityLayout } from '@/components/ActivityLayout';
import { Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSettings, useSettingsHydrated } from '@/storage/settings';
import { Onboarding } from '@/components/Onboarding';
import { Connectivity } from '@/components/Connectivity';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/api';
import { colors } from '@/theme';
import { t } from '@/i18n';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.bg);

const subscribeHydration = () => () => undefined;
const clientHydrated = () => true;
const serverHydrated = () => Platform.OS !== 'web';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  useEffect(startDownloadEngine, []);
  const settings = useSettings();
  const settingsHydrated = useSettingsHydrated();
  const pathname = usePathname();
  const [launchPath] = useState(pathname);
  const [deepLink, setDeepLink] = useState<boolean | null>(null);
  useEffect(() => {
    const subscription = Linking.addEventListener('url', () => setDeepLink(true));
    void Linking.getInitialURL().then(url => {
      if (!url) { setDeepLink(false); return; }
      const parsed = Linking.parse(url);
      const route = `${parsed.hostname ?? ''}/${parsed.path ?? ''}`;
      setDeepLink(/(?:^|\/)(series|watch|genre|settings)(?:\/|$)/.test(route) || launchPath !== '/');
    }).catch(() => setDeepLink(launchPath !== '/'));
    return () => subscription.remove();
  }, [launchPath]);
  const [queryClient] = useState(createQueryClient);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [loaded, error] = useFonts({ PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  useEffect(() => {
    if ((loaded || error) && settingsHydrated && deepLink !== null) void SplashScreen.hideAsync();
  }, [loaded, error, settingsHydrated, deepLink]);
  if (error) throw error;
  if (!loaded || !hydrated || !settingsHydrated || deepLink === null) return null;
  return <QueryClientProvider client={queryClient}>
    <UpdateProvider ready={settings.onboarded}>
    <StatusBar style="light" />
    {!settings.onboarded && !deepLink && launchPath === '/' ? <Onboarding /> : <Stack key={settings.language} screenOptions={{ headerShown: false, orientation: 'portrait', contentStyle: { backgroundColor: colors.bg },
      headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/language" />
      <Stack.Screen name="settings/storage" />
      <Stack.Screen name="settings/about" />
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev/design" options={{ headerShown: true, title: t('design'), headerBackTitle: t('back') }} />
      </Stack.Protected>
    </Stack>}
    <Connectivity />
    <PortalHost />
    </UpdateProvider>
  </QueryClientProvider>;
}

export function ErrorBoundary({ retry }: { retry: () => Promise<void> }) {
  return <ActivityLayout><RecoveryState kind="error" title={t('homeError')} description={t('homeErrorBody')} label={t('retry')} action={() => { void retry(); }} /></ActivityLayout>;
}
