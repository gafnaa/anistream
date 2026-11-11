import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type { EpisodeResponse, ResolvedSource } from './types';
export type DownloadOption = { url: string; quality: string; size: number };
export function useDownloadOptions(slug: string) {
  return useQuery({ queryKey: ['download-options', slug], enabled: !!slug, retry: 1,
    queryFn: async ({ signal }) => {
      const episode = await apiGet<EpisodeResponse>(`/api/episode/${encodeURIComponent(slug)}`, {}, signal);
      const options = await Promise.all(episode.sources.map(async source => {
        if (source.type === 'iframe' || source.kind === 'iframe' || source.type === 'hls') return null;
        let url = source.type === 'mp4' ? source.url : '';
        if (!url) {
          try {
            const resolved = await apiGet<ResolvedSource>('/api/resolve', { mirror: source.url }, signal);
            if (resolved.type === 'mp4') url = resolved.playUrl || resolved.url;
          } catch { return null; }
        }
        if (!/^https?:\/\//i.test(url)) return null;
        let size = 0;
        const headController = new AbortController();
        const cancelHead = () => headController.abort();
        signal.addEventListener('abort', cancelHead);
        if (signal.aborted) cancelHead();
        const timeout = setTimeout(cancelHead, 8000);
        try {
          const response = await fetch(url, { method: 'HEAD', signal: headController.signal });
          const length = Number(response.headers.get('content-length'));
          if (response.ok && Number.isFinite(length) && length > 0) size = length;
        } catch { /* Size estimates are optional; the download reports actual bytes. */ }
        finally { clearTimeout(timeout); signal.removeEventListener('abort', cancelHead); }
        return { url, quality: source.quality || source.label, size };
      }));
      return { episode, options: options.filter((item): item is DownloadOption => item !== null)
        .filter((item, index, items) => items.findIndex(other => other.quality === item.quality) === index) };
    } });
}
