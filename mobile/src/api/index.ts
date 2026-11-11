import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type { BrowseParams, EpisodeResponse, HomeResponse, PageResponse, SearchResponse, SeriesResponse } from './types';

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 2 } } });
}
export function useHome() {
  return useQuery({ queryKey: ['home'], queryFn: ({ signal }) => apiGet<HomeResponse>('/api/home', {}, signal) });
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
export function useBrowse(params: BrowseParams = {}) {
  return useInfiniteQuery({ queryKey: ['browse', params], initialPageParam: params.page ?? 1,
    queryFn: ({ pageParam, signal }) => apiGet<PageResponse>('/api/browse', { ...params, page: pageParam }, signal),
    getNextPageParam: last => last.hasNext ? last.page + 1 : undefined });
}

export function useResolvedSource(mirror: string, attempt: number) {
  return useQuery({ queryKey: ['resolve', mirror, attempt], enabled: !!mirror, retry: false,
    queryFn: ({ signal }) => apiGet<import('./types').ResolvedSource>('/api/resolve', { mirror }, signal) });
}
