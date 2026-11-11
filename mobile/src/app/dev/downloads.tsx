import { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { DownloadsScreen } from '@/components/DownloadsScreen';
import { DownloadQualitySheet } from '@/components/DownloadButton';
import type { DownloadRecord } from '@/downloads/queue';

// Local development export only. Production builds redirect and never seed user storage.
export default function DownloadDesign() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [sheet, setSheet] = useState(true);
  if (!__DEV__) return <Redirect href="/" />;
  const base: DownloadRecord = { slug: 'preview', seriesSlug: 'preview', title: 'Episode 12', seriesTitle: 'Frieren', episode: '12',
    poster: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg', url: '', quality: '720p', fileUri: '', status: 'ready', bytes: 210 * 1024 * 1024, total: 210 * 1024 * 1024 };
  const records: DownloadRecord[] = state === 'empty' || state === 'quality' ? [] : state === 'queue' ? [
    { ...base, slug: 'active', seriesTitle: 'Jujutsu Kaisen', poster: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', episode: '13', status: 'downloading', bytes: 130 * 1024 * 1024, eta: 120 },
    { ...base, slug: 'paused', seriesTitle: 'SPY × FAMILY', episode: '8', poster: 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg', status: 'paused', bytes: 54 * 1024 * 1024 },
    { ...base, slug: 'failed', seriesTitle: 'Blue Lock', episode: '4', poster: 'https://cdn.myanimelist.net/images/anime/1258/139474.jpg', status: 'failed', bytes: 0 },
  ] : [base, { ...base, slug: 'second', seriesTitle: 'Demon Slayer', episode: '7', poster: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' }];
  return <><DownloadsScreen previewRecords={records} initialQueue={state === 'queue'} />
    {state === 'quality' && <DownloadQualitySheet open={sheet} onClose={() => setSheet(false)} metadata={{ slug: base.slug, seriesSlug: base.seriesSlug, seriesTitle: base.seriesTitle, episode: base.episode, poster: base.poster }} previewOptions={[
      { quality: '480p', size: 110 * 1024 * 1024, url: '' }, { quality: '720p', size: base.total, url: '' }, { quality: '1080p', size: 340 * 1024 * 1024, url: '' },
    ]} />}
  </>;
}
