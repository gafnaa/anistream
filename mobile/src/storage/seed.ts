import { useMutation } from '@tanstack/react-query';
import { apiGet } from '@/api/client';
import type { EpisodeResponse, HomeResponse } from '@/api/types';
import { addHistory } from './index';

export function useSeedHistory() {
  return useMutation({ mutationFn: async () => {
    const home = await apiGet<HomeResponse>('/api/home');
    const items = home.latest.filter(item => item.kind === 'episode').slice(0, 3);
    for (const item of items) {
      const episode = await apiGet<EpisodeResponse>(`/api/episode/${item.slug}`);
      await addHistory({ episodeSlug: item.slug, seriesSlug: episode.seriesSlug ?? '', title: item.title,
        episode: String(item.episode ?? ''), poster: item.image ?? '', position: 420,
        duration: 1440, updatedAt: Date.now() });
    }
  } });
}
