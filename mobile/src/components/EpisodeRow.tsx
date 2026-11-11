import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { SeriesEpisode } from '@/api/types';
import { useSeriesProgress } from '@/storage';
import { colors } from '@/theme';
import { t } from '@/i18n';
import { Text } from './Text';
import { Button } from './ui/button';

export function EpisodeRow({ episode, seriesSlug, seriesTitle, current = false, onPress }: {
  episode: SeriesEpisode; seriesSlug: string; seriesTitle: string; current?: boolean; onPress?: () => void;
}) {
  const { byEpisode } = useSeriesProgress(seriesSlug);
  const progress = byEpisode.get(episode.slug)?.progress ?? 0;
  const watched = progress >= 0.9;
  const title = episode.title.replace(/\s*subtitle indonesia\s*$/i, '').replace(seriesTitle, '').trim() || episode.title;
  return <Button variant="ghost" accessibilityLabel={`${t('episodeLabel')} ${episode.number ?? ''}, ${title}`}
    accessibilityState={{ selected: current }} onPress={onPress ?? (() => router.push({ pathname: '/watch/[slug]', params: { slug: episode.slug } }))}
    style={{ minHeight: 80, paddingVertical: 16, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: current ? colors.card : 'transparent' }}>
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, minHeight: 48, borderRadius: 6, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><Text variant="title" tabular style={{ color: current ? colors.accent : colors.text }}>{episode.number ?? '▶'}</Text></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title" muted={watched}>{title}</Text>
          {!!episode.date && <Text variant="caption" muted>{episode.date}</Text>}
          {(current || progress > 0) && <Text variant="caption">{t(current ? 'nowPlaying' : watched ? 'watched' : 'inProgress')}</Text>}
        </View>
        <Ionicons name={watched ? 'checkmark-circle-outline' : 'play-circle-outline'} size={24} color={current ? colors.accent : colors.text} />
      </View>
      {progress > 0 && !watched && <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 4, backgroundColor: colors.line }}><View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: colors.brand }} /></View>}
    </View>
  </Button>;
}
