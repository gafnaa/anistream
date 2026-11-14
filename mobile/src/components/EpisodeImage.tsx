import { useState } from 'react';
import { Image, type ImageStyle } from 'expo-image';
import { episodeThumbUrl } from '@/api/client';

/** A frame from the episode itself; falls back to the series artwork until/unless the server has one. */
export function EpisodeImage({ slug, fallback, style }: { slug?: string | null; fallback?: string | null; style: ImageStyle }) {
  const [failedSlug, setFailedSlug] = useState<string | null>(null);
  const thumb = slug && !slug.startsWith('tm~') && failedSlug !== slug ? episodeThumbUrl(slug) : null;
  const source = thumb ?? fallback;
  if (!source) return null;
  return <Image source={source} placeholder={thumb ? fallback : undefined} placeholderContentFit="cover" contentFit="cover"
    transition={200} recyclingKey={slug ?? fallback ?? undefined} onError={() => slug && setFailedSlug(slug)} style={style} />;
}
