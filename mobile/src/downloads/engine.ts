import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as FS from 'expo-file-system/legacy';
import { downloads, downloadsReady, isDownloadPlaying } from './store';
import { getSettings, settingsReady } from '@/storage/settings';
import { canDownload, type DownloadRecord, type Network } from './queue';

let network: Network = { connected: false, wifi: false };
type Active = { slug: string; task: FS.DownloadResumable; pausing: boolean; pause?: Promise<void> };
let active: Active | undefined;
let foreground = true;
let pumping = false;
let runningSlug: string | undefined;
let settled: Promise<void> = Promise.resolve();
const removing = new Set<string>();
const directory = () => `${FS.documentDirectory}downloads/`;
export const downloadFileUri = (slug: string) => `${directory()}${encodeURIComponent(slug)}.mp4`;
export function downloadBlocked() { return !canDownload(network, getSettings().wifiOnly); }
export async function pauseDownload(slug: string, queued = false) {
  const current = active;
  if (current?.slug !== slug) { await downloads.patch(slug, { status: queued ? 'queued' : 'paused', eta: undefined }); return; }
  if (current.pause) return current.pause;
  current.pausing = true;
  current.pause = (async () => {
    try {
      await current.task.pauseAsync();
      const state = current.task.savable();
      await downloads.patch(slug, { status: queued ? 'queued' : 'paused', resumeData: state.resumeData, eta: undefined });
    } catch {
      // A failed pause must not leave a transfer running on cellular.
      await current.task.cancelAsync().catch(() => undefined);
      await downloads.patch(slug, { status: 'failed', resumeData: undefined, eta: undefined });
    } finally { if (active === current) active = undefined; void pump(); }
  })();
  return current.pause;
}
async function pump() {
  if (Platform.OS === 'web' || downloads.error || pumping || active || !foreground || downloadBlocked() || !downloads.hydrated) return;
  const item = downloads.snapshot().find(record => record.status === 'queued' && !removing.has(record.slug));
  if (!item) return;
  pumping = true;
  runningSlug = item.slug;
  let release!: () => void;
  settled = new Promise<void>(resolve => { release = resolve; });
  let transfer: Active | undefined;
  try {
    await downloads.start(item.slug, network, getSettings().wifiOnly);
    if (downloads.snapshot().find(record => record.slug === item.slug)?.status !== 'downloading') return;
    await FS.makeDirectoryAsync(directory(), { intermediates: true });
    let resumeData = item.resumeData;
    const partial = await FS.getInfoAsync(item.fileUri);
    // SDK 58 Android resume data is a byte offset. The actual file length is
    // authoritative after a process death between the last saved progress and disk write.
    if (Platform.OS === 'android') resumeData = partial.exists && !partial.isDirectory && partial.size > 0 ? String(partial.size) : undefined;
    if (removing.has(item.slug) || !downloads.snapshot().some(record => record.slug === item.slug)) return;
    let lastTime = Date.now(); let lastBytes = item.bytes;
    const task = FS.createDownloadResumable(item.url, item.fileUri, {}, progress => {
      const now = Date.now();
      if (now - lastTime < 1000) return;
      const bytes = progress.totalBytesWritten; const total = Math.max(0, progress.totalBytesExpectedToWrite);
      const rate = (bytes - lastBytes) / ((now - lastTime) / 1000);
      lastTime = now; lastBytes = bytes;
      void downloads.patch(item.slug, { bytes, total, eta: rate > 0 && total > bytes ? Math.ceil((total - bytes) / rate) : undefined,
        resumeData: task.savable().resumeData }).catch(() => { void pauseDownload(item.slug); });
    }, resumeData);
    const current: Active = { slug: item.slug, task, pausing: false };
    transfer = current;
    active = current;
    if (!foreground || downloadBlocked()) { await pauseDownload(item.slug, true); return; }
    const checkpoint = setTimeout(() => { void pauseDownload(item.slug, true); }, 30_000);
    let result: FS.FileSystemDownloadResult | undefined;
    try { result = resumeData ? await task.resumeAsync() : await task.downloadAsync(); } finally { clearTimeout(checkpoint); }
    if (current.pausing) return;
    if (!result || (resumeData ? result.status !== 206 : result.status !== 200)) throw new Error('Download failed');
    const contentType = Object.entries(result.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
    if (contentType && !/video\/|octet-stream/i.test(contentType)) throw new Error('Not a video');
    const info = await FS.getInfoAsync(result.uri);
    if (!info.exists || info.isDirectory || !info.size) throw new Error('Missing file');
    // A poster failure must not discard a successfully downloaded episode.
    let posterUri: string | undefined;
    active = undefined;
    if (item.poster && !downloadBlocked() && foreground) {
      try {
        const poster = await FS.downloadAsync(item.poster, `${directory()}${encodeURIComponent(item.slug)}.jpg`);
        if (poster.status === 200) posterUri = poster.uri;
      } catch { /* The UI retains its artwork placeholder offline. */ }
    }
    await downloads.patch(item.slug, { status: 'ready', bytes: info.size, total: info.size, posterUri, resumeData: undefined, eta: undefined });
  } catch {
    if (!transfer?.pausing) {
      await FS.deleteAsync(item.fileUri, { idempotent: true }).catch(() => undefined);
      await downloads.patch(item.slug, { status: 'failed', resumeData: undefined, bytes: 0, eta: undefined }).catch(() => undefined);
    }
  } finally {
    runningSlug = undefined;
    release();
    pumping = false;
    if (!active?.pausing) active = undefined;
    if (!active) void pump();
  }
}
export async function removeDownload(item: DownloadRecord) {
  if (isDownloadPlaying(item.slug)) throw new Error('Playing');
  removing.add(item.slug);
  try {
    if (active?.slug === item.slug) await pauseDownload(item.slug);
    if (runningSlug === item.slug) await settled;
    if (Platform.OS !== 'web') {
      await FS.deleteAsync(item.fileUri, { idempotent: true });
      await FS.deleteAsync(`${directory()}${encodeURIComponent(item.slug)}.jpg`, { idempotent: true });
    }
    await downloads.remove(item.slug);
  } finally { removing.delete(item.slug); }
}
export async function clearDownloads() {
  if (downloads.snapshot().some(item => isDownloadPlaying(item.slug))) throw new Error('Playing');
  for (const item of [...downloads.snapshot()]) await removeDownload(item);
}
export async function storageCapacity() {
  if (Platform.OS === 'web') return null;
  const [free, total] = await Promise.all([FS.getFreeDiskStorageAsync(), FS.getTotalDiskCapacityAsync()]);
  return { free, total };
}
export function startDownloadEngine() {
  if (Platform.OS === 'web') return () => undefined;
  let disposed = false;
  const reconcile = () => {
    if (active && (!foreground || downloadBlocked())) void pauseDownload(active.slug, true);
    else void pump();
  };
  const unsubscribe = NetInfo.addEventListener(state => {
    network = { connected: state.isConnected === true && state.isInternetReachable !== false, wifi: state.type === 'wifi' };
    reconcile();
  });
  const app = AppState.addEventListener('change', state => { foreground = state === 'active'; reconcile(); });
  const queue = downloads.subscribe(reconcile);
  // Settings persist independently; refreshing connectivity also applies a changed Wi-Fi rule.
  const timer = setInterval(reconcile, 1500);
  void Promise.all([downloadsReady, settingsReady]).then(async () => {
    for (const item of downloads.snapshot()) {
      if (item.status !== 'ready') continue;
      const info = await FS.getInfoAsync(item.fileUri);
      if (!info.exists) await downloads.patch(item.slug, { status: 'failed', bytes: 0, resumeData: undefined });
    }
    if (!disposed) reconcile();
  }).catch(() => undefined);
  return () => { disposed = true; unsubscribe(); app.remove(); queue(); clearInterval(timer); if (active) void pauseDownload(active.slug); };
}
