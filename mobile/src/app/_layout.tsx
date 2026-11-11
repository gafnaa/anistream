import '../../global.css';
import { PortalHost } from '@rn-primitives/portal';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
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

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [loaded, error] = useFonts({ PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (error) throw error;
  if (!loaded || !hydrated) return null;
  return <QueryClientProvider client={queryClient}>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false, orientation: 'portrait', contentStyle: { backgroundColor: colors.bg },
      headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev/design" options={{ headerShown: true, title: t('design'), headerBackTitle: t('back') }} />
      </Stack.Protected>
    </Stack>
    <PortalHost />
  </QueryClientProvider>;
}
