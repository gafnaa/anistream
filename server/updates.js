export const validSeriesSlug = slug => typeof slug === 'string' && /^[\w~.-]{1,200}$/.test(slug);

export function parseUpdateSlugs(value) {
  if (typeof value !== 'string') throw new Error('Invalid slugs');
  const slugs = value ? value.split(',') : [];
  if (slugs.length > 60 || slugs.some(slug => !validSeriesSlug(slug))) throw new Error('Invalid slugs (maximum 60)');
  return [...new Set(slugs)];
}

export async function seriesUpdates(slugs, loadSeries) {
  const results = new Array(slugs.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, slugs.length) }, async () => {
    while (cursor < slugs.length) {
      const index = cursor++;
      const slug = slugs[index];
      try {
        const series = await loadSeries(slug);
        let latest = null;
        for (const episode of series.episodes ?? []) {
          const number = episode.number === null || episode.number === '' ? NaN : Number(episode.number);
          if (Number.isFinite(number) && number >= 0 && (!latest || number > latest.number)) {
            latest = { number, slug: episode.slug || null };
          }
        }
        results[index] = { slug, title: series.title, image: series.image ?? null, latest };
      } catch {
        results[index] = { slug, title: slug, image: null, latest: null };
      }
    }
  }));
  return results;
}
