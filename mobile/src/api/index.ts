import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiGet, ApiError } from './client';
import { fallbackGenres } from './genres';
import type { Genre, BrowseParams, EpisodeResponse, HomeResponse, PageResponse, SearchResponse, SeriesResponse } from './types';

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 2 } } });
}
export function useHome() {
  return useQuery({ queryKey: ['home'], queryFn: ({ signal }) => apiGet<HomeResponse>('/api/home', {}, signal) });
}
export function useMovies(params: { type: 'movie' | 'tv'; list: string; genre?: string }) {
  return useInfiniteQuery({ queryKey: ['movies', params], initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => apiGet<PageResponse>('/api/movies', { ...params, page: pageParam }, signal),
    getNextPageParam: last => last.hasNext ? last.page + 1 : undefined });
}
export function useMovieGenres(type: 'movie' | 'tv') {
  return useQuery({ queryKey: ['movie-genres', type], staleTime: 3600_000,
    queryFn: ({ signal }) => apiGet<Genre[]>('/api/movies/genres', { type }, signal) });
}
export function useMovieRecommendations(slug: string) {
  return useQuery({ queryKey: ['movie-recommendations', slug], enabled: /^tm~movie~\d+$/.test(slug), staleTime: 6 * 3600_000,
    queryFn: ({ signal }) => apiGet<{ items: PageResponse['items'] }>(`/api/movies/${encodeURIComponent(slug)}/recommendations`, {}, signal) });
}
export function useAppLatest(enabled = false) {
  return useQuery({ queryKey: ['app-latest'], enabled, retry: false, staleTime: 600_000,
    queryFn: ({ signal }) => apiGet<import('./types').AppRelease>('/api/app/latest', {}, signal) });
}
export function useLatest(page = 1) {
  return useInfiniteQuery({ queryKey: ['latest', page], initialPageParam: page,
    queryFn: ({ pageParam, signal }) => apiGet<PageResponse>('/api/latest', { page: pageParam }, signal),
    getNextPageParam: last => last.hasNext ? last.page + 1 : undefined });
}
export function useSeries(slug: string) {
  return useQuery({ queryKey: ['series', slug], enabled: !!slug,
    queryFn: ({ signal }) => apiGet<SeriesResponse>(`/api/series/${encodeURIComponent(slug)}`, {}, signal) });
}
export function useEpisode(slug: string) {
  return useQuery({ queryKey: ['episode', slug], enabled: !!slug,
    queryFn: ({ signal }) => apiGet<EpisodeResponse>(`/api/episode/${encodeURIComponent(slug)}`, {}, signal) });
}
export function useSearch(q: string) {
  const query = q.trim();
  return useInfiniteQuery({ queryKey: ['search', query], enabled: !!query, initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => apiGet<SearchResponse>('/api/search', { q: query, page: pageParam }, signal),
    getNextPageParam: last => last.hasNext ? last.page + 1 : undefined });
}
export function useSkipTimes(title: string | null | undefined, episode: number | undefined, duration: number) {
  const roundedDuration = Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0;
  return useQuery({ queryKey: ['skip', title, episode, roundedDuration],
    enabled: !!title && Number.isFinite(episode) && episode! > 0, staleTime: 86_400_000, retry: false,
    queryFn: ({ signal }) => apiGet<import('./types').SkipTimes>('/api/skip', { title: title!, episode, duration: roundedDuration }, signal) });
}
export function useBrowse(params: BrowseParams = {}, enabled = true) {
  return useInfiniteQuery({ queryKey: ['browse', params], enabled, initialPageParam: params.page ?? 1,
    queryFn: ({ pageParam, signal }) => apiGet<PageResponse>('/api/browse', { ...params, page: pageParam }, signal),
    getNextPageParam: last => last.hasNext ? last.page + 1 : undefined });
}

export function useGenres() {
  const query = useQuery({ queryKey: ['genres'], staleTime: 86_400_000,
    queryFn: async ({ signal }) => {
      try { return await apiGet<Genre[]>('/api/genres', {}, signal); } catch (error) {
        if (error instanceof ApiError && error.status === 404) return fallbackGenres;
        throw error;
      }
    } });
  return { ...query, data: query.data ?? (query.isError ? fallbackGenres : undefined) };
}

export function useResolvedSource(mirror: string, attempt: number) {
  return useQuery({ queryKey: ['resolve', mirror, attempt], enabled: !!mirror, retry: false,
    queryFn: ({ signal }) => apiGet<import('./types').ResolvedSource>('/api/resolve', { mirror }, signal) });
}

export function useSchedule() {
  return useQuery({ queryKey: ['schedule'], staleTime: 60_000,
    queryFn: ({ signal }) => apiGet<import('./types').ScheduleResponse>('/api/schedule', {}, signal) });
}
