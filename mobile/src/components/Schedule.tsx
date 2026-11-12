import { useEffect, useState, type ReactNode } from 'react';
import { Press } from '@/components/Press';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSchedule } from '@/api';
import { useBookmarks } from '@/storage';
import { t } from '@/i18n';
import { colors } from '@/theme';
import { Text } from './Text';
import { EpisodeThumbnail } from './EpisodeRow';
import { RecoveryState } from './RecoveryState';
import { ListItemSkeleton, SkeletonMotionControl } from './skeleton';
import { useTabBarInset } from './GlassTabBar';

export function Schedule({ header }: { header: ReactNode }) {
  const query = useSchedule();
  const bookmarks = useBookmarks();
  const bottom = useTabBarInset();
  // Calendar arithmetic uses UTC after shifting to WIB, independent of device timezone.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const wib = new Date(now + 7 * 3600_000);
  const today = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 12));
  const todayIndex = (today.getUTCDay() + 6) % 7;
  const [selectedDay, setSelected] = useState<number | null>(null);
  const selected = selectedDay ?? todayIndex;
  const locale = t('today') === 'Hari ini' ? 'id-ID' : 'en-US';
  const dates = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + (i - todayIndex) * 86400_000));
  const heading = dates[selected].toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const items = query.data?.days.find(day => day.weekday === selected + 1)?.items ?? [];
  return <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottom }}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.brand} />}>
    {header}
    <Text muted style={{ marginBottom: 20 }}>{t('thisWeek')}</Text>
    <View style={{ flexDirection: 'row', gap: 5, marginBottom: 36 }}>
      {dates.map((date, index) => <Press key={index} accessibilityRole="tab" accessibilityState={{ selected: index === selected }}
        accessibilityLabel={`${date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}${index === todayIndex ? `, ${t('today')}` : ''}`}
        onPress={() => setSelected(index)} style={({ pressed }) => ({ flex: 1, minHeight: 72, paddingVertical: 12, alignItems: 'center', justifyContent: 'space-between', borderRadius: 8,
          backgroundColor: index === selected ? colors.primary : colors.card, opacity: pressed ? 0.7 : 1 })}>
        <Text variant="caption" style={{ fontSize: 11, color: index === selected ? '#FFFFFF' : colors.muted }}>{date.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}</Text>
        <Text style={{ color: index === selected ? '#FFFFFF' : colors.text }}>{date.getUTCDate()}</Text>
      </Press>)}
    </View>
    <Text variant="h2" accessibilityRole="header" style={{ marginBottom: 8 }}>{heading}</Text>
    {query.isPending ? <SkeletonMotionControl>{[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</SkeletonMotionControl>
      : query.isError && !query.data ? <RecoveryState kind="error" title={t('scheduleError')} description={t('homeErrorBody')} label={t('retry')} action={() => { void query.refetch(); }} />
      : <>
        {query.isRefetchError && <RecoveryState kind="error" title={t('cachedError')} description={t('scheduleError')} label={t('retry')} action={() => { void query.refetch(); }} />}
        {!items.length && <Text muted style={{ paddingVertical: 24 }}>{t('scheduleEmpty')}</Text>}
        {items.map(item => <Press key={item.seriesSlug} accessibilityRole="button"
          onPress={() => router.push({ pathname: item.released && item.episodeSlug ? '/watch/[slug]' : '/series/[slug]', params: { slug: item.released && item.episodeSlug ? item.episodeSlug : item.seriesSlug } })}
          style={({ pressed }) => ({ flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 18, opacity: pressed ? 0.7 : 1 })}>
          <EpisodeThumbnail image={item.image} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="title" numberOfLines={2}>{item.title}</Text>
            <Text variant="caption" muted>{t('episodeLabel')} {item.episode ?? '–'}{!item.released ? ` · ${t('upcoming')}` : ''}</Text>
            <Text variant="caption" muted>{item.time.replace(':', '.')} WIB</Text>
            {bookmarks.some(saved => saved.slug === item.seriesSlug) && <Text variant="caption" style={{ color: colors.accent }}>{t('savedMarker')}</Text>}
          </View>
        </Press>)}
      </>}
    <Text variant="caption" muted style={{ marginTop: 48 }}>{t('scheduleNote')}</Text>
  </ScrollView>;
}
