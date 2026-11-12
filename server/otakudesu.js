import * as cheerio from 'cheerio';

export const OD_BASE = 'https://otakudesu.blog';
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
export const cleanOdTitle = title => clean(title.replace(/\([^)]*episode[^)]*\)/gi, '').replace(/subtitle\s+indonesia|sub\s+indo/gi, '').replace(/\s*\+\s*OVA\s*$/i, '').replace(/\s+BD\b/gi, ''));

export function odUrl(slug, kind) {
  if (/^od~[a-z0-9-]+$/.exec(slug)?.[0] !== slug) throw new Error('Invalid Otakudesu slug');
  return `${OD_BASE}/${kind}/${slug.slice(3)}/`;
}

function odSlug(href, kind) {
  try {
    const url = new URL(href, OD_BASE);
    const match = url.pathname.match(new RegExp(`^/${kind}/([a-z0-9-]+)/?$`));
    return url.origin === OD_BASE && match ? `od~${match[1]}` : null;
  } catch { return null; }
}

function fields($, nodes) {
  const result = {};
  nodes.each((_, el) => {
    const label = clean($(el).find('b').first().text()).replace(/:$/, '').toLowerCase();
    if (label) result[label] = clean($(el).clone().find('b').remove().end().text()).replace(/^:\s*/, '');
  });
  return result;
}

export function parseOdSearch(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('h2 a[href*="/anime/"]').each((_, el) => {
    const a = $(el), url = a.attr('href'), slug = odSlug(url, 'anime');
    if (!slug || items.some(item => item.slug === slug)) return;
    const card = a.closest('li'), metadata = fields($, card.find('.set'));
    items.push({ slug, title: cleanOdTitle(a.text()), episodeTitle: null,
      image: card.find('img').attr('data-src') || card.find('img').attr('src') || null,
      type: metadata.tipe || metadata.type || null, status: metadata.status || null,
      episode: null, kind: 'series', url: odUrl(slug, 'anime') });
  });
  return { items, hasNext: $('.pagination .next, .nav-links .next').length > 0 };
}

export function parseOdSeries(html, slug) {
  odUrl(slug, 'anime');
  const $ = cheerio.load(html), metadata = fields($, $('.infozingle p'));
  const title = cleanOdTitle(metadata.judul || $('.jdlrx h1').first().text());
  if (!title) throw new Error('Series not found');
  const image = $('.fotoanime > img').attr('data-src') || $('.fotoanime > img').attr('src') || null;
  const genreLinks = $('.infozingle a[href*="/genres/"]').map((_, el) => ({ slug: new URL($(el).attr('href'), OD_BASE).pathname.split('/').filter(Boolean).pop(), name: clean($(el).text()) })).get();
  const episodes = [];
  $('.episodelist li').each((_, el) => {
    const a = $(el).find('a').first(), episodeSlug = odSlug(a.attr('href'), 'episode');
    if (!episodeSlug || episodes.some(item => item.slug === episodeSlug)) return;
    const title = clean(a.text());
    episodes.push({ slug: episodeSlug, number: title.match(/episode\s*(\d+(?:\.\d+)?)/i)?.[1] || null,
      title, date: clean($(el).find('.zeebr').text()), url: odUrl(episodeSlug, 'episode') });
  });
  episodes.sort((a, b) => (Number(a.number) || Infinity) - (Number(b.number) || Infinity));
  return { slug, title, image, banner: image, synopsis: clean($('.sinopc').text()) || null,
    genres: genreLinks.map(item => item.name), genreLinks, trailerId: null,
    status: metadata.status || null, studio: metadata.studio || null, released: metadata['tanggal rilis'] || null,
    season: null, type: metadata.tipe || null, rating: metadata.skor || null, episodes };
}

export function parseOdEpisode(html, slug) {
  odUrl(slug, 'episode');
  const $ = cheerio.load(html), title = clean($('h1.posttl').first().text());
  if (!title) throw new Error('Episode not found');
  const nav = $('.prevnext');
  const seriesSlug = odSlug(nav.find('a[href*="/anime/"]').first().attr('href'), 'anime');
  const previous = nav.find('a').filter((_, el) => /prev|sebelum/i.test(`${$(el).text()} ${$(el).attr('title')} ${$(el).attr('rel')}`)).first();
  const next = nav.find('a').filter((_, el) => /next|selanjutnya/i.test(`${$(el).text()} ${$(el).attr('title')} ${$(el).attr('rel')}`)).first();
  return { slug, title, seriesSlug, seriesTitle: cleanOdTitle(title.replace(/\s+episode\s+.*$/i, '')) || null,
    prevSlug: odSlug(previous.attr('href'), 'episode'), nextSlug: odSlug(next.attr('href'), 'episode'), raw: [] };
}
