import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';
import { apiGet } from '@/api/client';
import { readBookmarks } from '@/storage';
import { getSettings, settingsReady, updateSettings } from '@/storage/settings';
import { t } from '@/i18n';
import { diffUpdates, type SavedLatest, type SeriesUpdate } from './diff';

const TASK = 'anistream.new-episodes.v1';
const STATE = 'anistream.episode-latest.v1';
const LAST_CHECK = 'anistream.episode-check.v1';
const CHANNEL = 'new-episodes';
let pending = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.then(() => undefined, () => undefined);
  return result;
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  TaskManager.defineTask(TASK, async () => {
    try { await checkEpisodes(); return BackgroundTask.BackgroundTaskResult.Success; }
    catch { return BackgroundTask.BackgroundTaskResult.Failed; }
  });
}

async function channel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: t('episodeChannel'), importance: AndroidImportance.DEFAULT });
}

// Delivery is separate from polling so a future push transport can reuse the payload.
export async function deliverEpisodeNotification(title: string, body: string, data: Record<string, string> = {}) {
  await channel();
  await Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null });
}

export function checkEpisodes(foreground = false) {
  return serial(async () => {
    await settingsReady;
    if (Platform.OS === 'web' || !getSettings().episodeNotifications) return;
    const now = Date.now();
    const last = Number(await AsyncStorage.getItem(LAST_CHECK));
    if (foreground && now - last < 15 * 60_000) return;
    const bookmarks = await readBookmarks();
    const raw = await AsyncStorage.getItem(STATE);
    const previous: SavedLatest = raw ? JSON.parse(raw) : {};
    const updates: SeriesUpdate[] = [];
    for (let offset = 0; offset < bookmarks.length; offset += 60) {
      updates.push(...await apiGet<SeriesUpdate[]>('/api/updates', { slugs: bookmarks.slice(offset, offset + 60).map(item => item.slug).join(',') }));
    }
    // Re-read after the request to respect bookmarks removed while offline/fetching.
    const current = await readBookmarks();
    const { next, fresh, summary } = diffUpdates(current, updates, previous);
    if (getSettings().episodeNotifications && (await Notifications.getPermissionsAsync()).granted) {
      if (summary) await deliverEpisodeNotification(t('episodeSummaryTitle'), t('episodeSummaryBody').replace('{count}', String(fresh.length)), { seriesSlug: fresh[0].slug });
      else for (const item of fresh) {
        await deliverEpisodeNotification(item.title, t('episodeReleased').replace('{number}', String(item.latest!.number)), { seriesSlug: item.slug, ...(item.latest!.slug ? { episodeSlug: item.latest!.slug } : {}) });
      }
    }
    await AsyncStorage.setItem(STATE, JSON.stringify(next));
    await AsyncStorage.setItem(LAST_CHECK, String(now));
  });
}

export async function syncEpisodeTask() {
  await settingsReady;
  if (Platform.OS === 'web') return;
  const registered = await TaskManager.isTaskRegisteredAsync(TASK);
  const enabled = getSettings().episodeNotifications && (await Notifications.getPermissionsAsync()).granted;
  if (!enabled && registered) await BackgroundTask.unregisterTaskAsync(TASK);
  if (enabled && !registered && await TaskManager.isAvailableAsync()) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 });
}

export async function enableEpisodeNotifications() {
  await settingsReady;
  await channel();
  await updateSettings({ episodeNotifications: true, notificationPermissionAsked: true });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) Alert.alert(t('episodeNotifications'), t('notificationDenied'), [
    { text: t('cancel'), style: 'cancel' }, { text: t('openSystemSettings'), onPress: () => { void Linking.openSettings(); } },
  ]);
  await syncEpisodeTask();
}

export async function setEpisodeNotifications(enabled: boolean) {
  if (enabled) await enableEpisodeNotifications();
  else { await updateSettings({ episodeNotifications: false }); await syncEpisodeTask(); }
}

export async function bookmarksChanged(added: boolean) {
  await settingsReady;
  if (Platform.OS === 'web') return;
  if (added && (await readBookmarks()).length && getSettings().episodeNotifications && !getSettings().notificationPermissionAsked) await enableEpisodeNotifications();
  await checkEpisodes();
}

export async function testEpisodeNotification() {
  await enableEpisodeNotifications();
  if ((await Notifications.getPermissionsAsync()).granted) await deliverEpisodeNotification(t('episodeNotifications'), t('notificationTestBody'));
}
