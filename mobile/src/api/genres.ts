import type { Genre } from './types';

// Verified against the samehadaku /anime/ genre filter, November 2026.
export const fallbackGenres: Genre[] = [
  { slug: 'action', name: 'Action' }, { slug: 'adventure', name: 'Adventure' },
  { slug: 'comedy', name: 'Comedy' }, { slug: 'drama', name: 'Drama' },
  { slug: 'fantasy', name: 'Fantasy' }, { slug: 'romance', name: 'Romance' },
  { slug: 'sci-fi', name: 'Sci-Fi' }, { slug: 'slice-of-life', name: 'Slice of Life' },
  { slug: 'sports', name: 'Sports' }, { slug: 'isekai', name: 'Isekai' },
];
