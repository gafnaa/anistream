import { useState } from 'react';
import { View } from 'react-native';
import { ActivityLayout, ActivityEmpty } from '@/components/ActivityLayout';
import { PosterGrid } from '@/components/PosterGrid';
import { Text } from '@/components/Text';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { RemovalDialog } from '@/components/RemovalDialog';
import { useBookmarks, useBookmarksHydrated, useHistory, toggleBookmark, type Bookmark } from '@/storage';
import { colors } from '@/theme';
import { t } from '@/i18n';

export default function Me() {
  const bookmarks = useBookmarks(); const hydrated = useBookmarksHydrated(); const history = useHistory(); const [az, setAZ] = useState(false);
  const [removal, setRemoval] = useState<Bookmark | null>(null); const [error, setError] = useState(false);
  const items = [...bookmarks].sort((a, b) => az ? a.title.localeCompare(b.title) : b.addedAt - a.addedAt).map(item => ({ ...item, image: item.poster }));
  const seconds = history.reduce((total, item) => total + Math.max(0, Math.min(item.position, item.duration > 0 ? item.duration : item.position)), 0);
  return <ActivityLayout><PosterGrid items={items} loading={!hydrated} retry={() => undefined} onLongPress={item => { setError(false); setRemoval(bookmarks.find(saved => saved.slug === item.slug) ?? null); }} tabScreen empty={<ActivityEmpty />}
    header={<View style={{ paddingTop: 24, gap: 24, paddingBottom: 20 }}><Text variant="h1" accessibilityRole="header">{t('me')}</Text>
      <View style={{ flexDirection: 'row', paddingVertical: 24, paddingHorizontal: 20, backgroundColor: colors.card, borderRadius: 10 }}>
        <View style={{ width: '50%', gap: 8 }}><Text variant="display" tabular>{history.filter(item => item.position > 0).length}</Text><Text variant="caption" muted>{t('episodesWatched')}</Text></View>
        <View style={{ width: '50%', borderLeftWidth: 1, borderColor: colors.line, paddingLeft: 20, gap: 8 }}><Text variant="display" tabular>{Math.round(seconds / 360) / 10} {t('hours')}</Text><Text variant="caption" muted>{t('watchTime')}</Text></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ gap: 8 }}><Text variant="h2">{t('myList')}</Text><Text variant="caption" muted>{bookmarks.length} {t('serialCount')}</Text></View>
        <Button variant="ghost" accessibilityLabel={`${t('recentlyAdded')} / ${t('sortAZ')}`} accessibilityState={{ selected: az }} onPress={() => setAZ(!az)}><Text variant="caption">{t(az ? 'sortAZ' : 'recentlyAdded')}</Text><Icon name="swap-vertical" color={colors.text} size={20} /></Button></View>
    </View>} /><RemovalDialog open={removal !== null} onOpenChange={open => { if (!open) setRemoval(null); }} title={t('removeBookmark')} description={removal?.title ?? ''} error={error} onRemove={() => {
      if (removal) void toggleBookmark(removal).then(() => setRemoval(null)).catch(() => setError(true));
    }} /></ActivityLayout>;
}
