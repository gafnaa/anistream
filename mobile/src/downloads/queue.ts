export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'failed' | 'ready';
export type DownloadRecord = {
  slug: string; seriesSlug: string; seriesTitle: string; title: string; episode: string;
  poster: string; posterUri?: string; url: string; quality: string; fileUri: string;
  status: DownloadStatus; bytes: number; total: number; eta?: number; resumeData?: string;
};
export type Network = { connected: boolean; wifi: boolean };
export const canDownload = (network: Network, wifiOnly: boolean) => network.connected && (!wifiOnly || network.wifi);
export function recover(records: DownloadRecord[]): DownloadRecord[] {
  return records.map(item => item.status === 'downloading' ? { ...item, status: 'paused', eta: undefined } : item);
}
export type QueueStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const key = 'anistream.downloads.v1';
const statuses = new Set(['queued', 'downloading', 'paused', 'failed', 'ready']);
function valid(value: unknown): value is DownloadRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as DownloadRecord;
  return ['slug', 'seriesSlug', 'seriesTitle', 'title', 'episode', 'poster', 'url', 'quality', 'fileUri'].every(field => typeof (item as unknown as Record<string, unknown>)[field] === 'string') && statuses.has(item.status) && Number.isFinite(item.bytes) && Number.isFinite(item.total);
}
export class DownloadQueue {
  private records: DownloadRecord[] = [];
  private listeners = new Set<() => void>();
  private pending = Promise.resolve();
  private loading?: Promise<void>;
  hydrated = false;
  error = false;
  private storage: QueueStorage;
  constructor(storage: QueueStorage) { this.storage = storage; }
  snapshot = () => this.records;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() { this.listeners.forEach(listener => listener()); }
  load() {
    this.loading ??= this.read();
    return this.loading;
  }
  private async read() {
    try {
      const raw = await this.storage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      this.records = recover(Array.isArray(parsed) ? parsed.filter(valid) : []);
      await this.storage.setItem(key, JSON.stringify(this.records));
    } catch { this.error = true; } finally { this.hydrated = true; this.emit(); }
  }
  private change(transform: (records: DownloadRecord[]) => DownloadRecord[]) {
    const operation = this.pending.then(async () => {
      await this.load();
      const next = transform(this.records);
      await this.storage.setItem(key, JSON.stringify(next));
      this.records = next; this.error = false; this.emit();
    });
    this.pending = operation.catch(() => { this.error = true; this.emit(); });
    return operation;
  }
  add(item: DownloadRecord) { return this.change(items => items.some(other => other.slug === item.slug) ? items : [...items, item]); }
  patch(slug: string, patch: Partial<DownloadRecord>) { return this.change(items => items.map(item => item.slug === slug ? { ...item, ...patch } : item)); }
  remove(slug: string) { return this.change(items => items.filter(item => item.slug !== slug)); }
  start(slug: string, network: Network, wifiOnly: boolean) {
    return this.change(items => !canDownload(network, wifiOnly) || items.some(item => item.status === 'downloading') ? items : items.map(item => item.slug === slug && item.status === 'queued' ? { ...item, status: 'downloading' } : item));
  }
  resume(slug: string) { return this.change(items => items.map(item => item.slug === slug && (item.status === 'paused' || item.status === 'failed') ? { ...item, status: 'queued', eta: undefined } : item)); }
}
