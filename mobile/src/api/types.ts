export type TrendingCard = {
  slug: string; title: string; image: string | null; kind: 'series';
};
export type CatalogueCard = {
  slug: string; title: string; image: string | null; kind: 'series' | 'episode';
  episodeTitle: string | null; type: string | null; status: string | null;
  episode: number | null; url: string;
};
export type HomeResponse = {
  latest: CatalogueCard[]; ongoing: CatalogueCard[]; trending: TrendingCard[];
};
export type PageResponse = { items: CatalogueCard[]; page: number; hasNext: boolean };
export type SearchResponse = PageResponse & { query: string };
export type Genre = { slug: string; name: string; count?: number };
export type SeriesEpisode = { slug: string; number: string | null; title: string; date: string; url: string };
export type SeriesResponse = {
  slug: string; title: string; image: string | null; banner: string | null; synopsis: string | null;
  genres: string[]; genreLinks?: Genre[]; trailerId: string | null; status: string | null; studio: string | null;
  released: string | null; season: string | null; type: string | null; rating: string | null;
  episodes: SeriesEpisode[];
};
export type EpisodeSource = { label: string; url: string; host: string; kind: 'iframe' | 'resolvable'; provider?: 'otakudesu'; quality?: string | null; type?: 'mp4' | 'hls' | 'iframe' };
export type EpisodeResponse = {
  slug: string; title: string; seriesSlug: string | null; seriesTitle: string | null;
  prevSlug: string | null; nextSlug: string | null; sources: EpisodeSource[];
  raw: { label: string; url: string; embed: string | null }[];
};
export type BrowseParams = { status?: string; type?: string; order?: string; genre?: string; page?: number };

export type ResolvedSource = { type: 'hls' | 'mp4' | 'iframe'; url: string; playUrl?: string };
