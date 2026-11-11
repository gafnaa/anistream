import { useEffect, useState } from 'react';
import { SectionList, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { ActivityLayout, ActivityEmpty, dayLabel, relativeTime } from '@/components/ActivityLayout';
import { ActivityEpisodeRow } from '@/components/ActivityEpisodeRow';
import { Text } from '@/components/Text';
import { Toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RemovalDialog } from '@/components/RemovalDialog';
import { ListItemSkeleton, SkeletonMotionControl } from '@/components/skeleton';
import { useTabBarInset } from '@/components/GlassTabBar';
import { useHistory, useHistoryHydrated, clearHistory, removeHistory, type HistoryItem } from '@/storage';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function History() {
  const history = useHistory(); const hydrated = useHistoryHydrated(); const bottom = useTabBarInset();
  const [mode, setMode] = useState('all'); const [removal, setRemoval] = useState<HistoryItem | 'all' | null>(null); const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  const ordered = [...history].sort((a, b) => b.updatedAt - a.updatedAt);
  const items = mode === 'series' ? ordered.filter((item, i) => ordered.findIndex(other => (other.seriesSlug || other.title) === (item.seriesSlug || item.title)) === i) : ordered;
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) { const day = dayLabel(item.updatedAt); groups.set(day, [...(groups.get(day) ?? []), item]); }
  return <ActivityLayout><SectionList sections={[...groups].map(([title, data]) => ({ title, data }))} keyExtractor={item => item.episodeSlug} stickySectionHeadersEnabled={false}
    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom }}
    ListHeaderComponent={<View style={{ paddingTop: 24, paddingBottom: history.length ? 32 : 0, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text variant="h1" accessibilityRole="header">{t('history')}</Text>{history.length > 0 && <Button variant="ghost" size="icon" accessibilityLabel={t('clearHistory')} onPress={() => { setError(false); setRemoval('all'); }}><Trash2 color={colors.text} size={24} /></Button>}</View>
      {history.length > 0 && <ToggleGroup type="single" value={mode} onValueChange={value => { if (value) setMode(value); }} style={{ width: '100%', gap: 10 }}><ToggleGroupItem value="all" style={{ flex: 1 }}><Text variant="caption">{t('allEpisodes')}</Text></ToggleGroupItem><ToggleGroupItem value="series" style={{ flex: 1 }}><Text variant="caption">{t('bySeries')}</Text></ToggleGroupItem></ToggleGroup>}
    </View>}
    renderSectionHeader={({ section }) => <Text variant="h2" style={{ marginTop: 8, marginBottom: 6 }}>{section.title}</Text>}
    renderItem={({ item }) => {
      const progress = item.duration > 0 ? Math.min(1, Math.max(0, item.position / item.duration)) : 0;
      return <ActivityEpisodeRow slug={item.episodeSlug} title={item.title} episode={item.episode} image={item.poster} progress={progress}
        meta={progress >= 0.9 ? t('finished') : `${Math.ceil(Math.max(0, item.duration - item.position) / 60)} ${t('minutesLeft')} · ${relativeTime(item.updatedAt)}`}
        onRemove={() => { setError(false); setRemoval(item); }} />;
    }}
    ListEmptyComponent={hydrated ? <ActivityEmpty history /> : <SkeletonMotionControl>{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</SkeletonMotionControl>} />
    <RemovalDialog open={removal !== null} onOpenChange={open => { if (!open) setRemoval(null); }} title={t(removal === 'all' ? 'clearHistoryTitle' : 'removeHistory')}
      description={removal === 'all' ? t('clearHistoryBody') : removal?.title ?? ''} actionLabel={removal === 'all' ? t('clearHistory') : undefined} error={error}
      onRemove={() => { setError(false); void (removal === 'all' ? clearHistory() : removal ? removeHistory(removal.episodeSlug) : Promise.resolve()).then(() => { setRemoval(null); setNotice(t('historyRemoved')); }).catch(() => setError(true)); }} />
    {!!notice && <Toast message={notice} style={{ position: 'absolute', bottom, left: 24, right: 24 }} />}
  </ActivityLayout>;
}
