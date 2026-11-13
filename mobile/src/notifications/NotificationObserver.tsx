import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { checkEpisodes, syncEpisodeTask } from './service';

export function NotificationObserver() {
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (Platform.OS === 'web' || !navigation?.key) return;
    let active = true;
    const handled = new Set<string>();
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const id = response.notification.request.identifier;
      if (handled.has(id)) return;
      handled.add(id);
      const data = response.notification.request.content.data ?? {};
      const valid = (value: unknown): value is string => typeof value === 'string' && /^[\w~.-]{1,200}$/.test(value);
      if (valid(data.episodeSlug)) router.push({ pathname: '/watch/[slug]', params: { slug: data.episodeSlug } });
      else if (valid(data.seriesSlug)) router.push({ pathname: '/series/[slug]', params: { slug: data.seriesSlug } });
      void Notifications.clearLastNotificationResponseAsync();
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const check = () => {
      void syncEpisodeTask().catch(() => undefined);
      void checkEpisodes(true).catch(() => undefined);
    };
    check();
    const appState = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    return () => { active = false; subscription.remove(); appState.remove(); };
  }, [navigation?.key]);
  return null;
}
