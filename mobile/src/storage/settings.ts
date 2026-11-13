import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Settings = { language: 'id' | 'en' | 'system'; autoplayNext: boolean; resume: boolean; onboarded: boolean; wifiOnly: boolean; profileId?: string; episodeNotifications: boolean; notificationPermissionAsked: boolean };
const defaults: Settings = { language: 'system', autoplayNext: true, resume: true, onboarded: false, wifiOnly: true, episodeNotifications: true, notificationPermissionAsked: false };
let settings = defaults;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const settingsReady = AsyncStorage.getItem('anistream.settings.v1').then(raw => {
  const value = raw ? JSON.parse(raw) : {};
  const profileId = typeof value?.profileId === 'string' && value.profileId ? value.profileId
    : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  settings = { profileId, episodeNotifications: value?.episodeNotifications !== false, notificationPermissionAsked: value?.notificationPermissionAsked === true, language: ['id', 'en', 'system'].includes(value?.language) ? value.language : 'system',
    autoplayNext: typeof value?.autoplayNext === 'boolean' ? value.autoplayNext : true,
    resume: typeof value?.resume === 'boolean' ? value.resume : true, onboarded: value?.onboarded === true, wifiOnly: value?.wifiOnly !== false };
  if (value?.profileId !== profileId) return AsyncStorage.setItem('anistream.settings.v1', JSON.stringify(settings));
}).catch(() => { settings = { ...settings, profileId: undefined }; }).finally(() => { hydrated = true; emit(); });
let pending = Promise.resolve();
export function updateSettings(change: Partial<Settings>) {
  const operation = pending.then(async () => {
    await settingsReady;
    const next = { ...settings, ...change };
    await AsyncStorage.setItem('anistream.settings.v1', JSON.stringify(next));
    settings = next; emit();
  });
  pending = operation.catch(() => undefined);
  return operation;
}
export const getSettings = () => settings;
export const useSettings = () => useSyncExternalStore(subscribe, getSettings, () => defaults);
export const useSettingsHydrated = () => useSyncExternalStore(subscribe, () => hydrated, () => false);
