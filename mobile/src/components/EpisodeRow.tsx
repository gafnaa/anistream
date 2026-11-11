import { View } from 'react-native';
import { Image } from 'expo-image';
import Icon from '@/components/Icon';
import { router } from 'expo-router';
import type { SeriesEpisode } from '@/api/types';
import { useSeriesProgress } from '@/storage';
import { colors } from '@/theme';
import { t } from '@/i18n';
import { Text } from './Text';
import { Button } from './ui/button';

export function EpisodeRow({ episode, seriesSlug, seriesTitle, current = false, image, onPress }: {
  episode: SeriesEpisode; seriesSlug: string; seriesTitle: string; current?: boolean; image?: string | null; onPress?: () => void;
}) {
  const { byEpisode } = useSeriesProgress(seriesSlug);
  const progress = byEpisode.get(episode.slug)?.progress ?? 0;
  const watched = progress >= 0.9;
  const title = episode.title.replace(/\s*subtitle indonesia\s*$/i, '').replace(seriesTitle, '').trim() || episode.title;
  return <Button variant="ghost" accessibilityLabel={`${t('episodeLabel')} ${episode.number ?? ''}, ${title}`}
    accessibilityState={{ selected: current }} onPress={onPress ?? (() => router.push({ pathname: '/watch/[slug]', params: { slug: episode.slug } }))}
    style={{ height: 'auto', minHeight: 88, paddingVertical: 8, paddingHorizontal: 0, borderRadius: 10, backgroundColor: current ? colors.card : 'transparent' }}>
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <EpisodeThumbnail image={image} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title" muted={watched}>{t('episodeLabel')} {episode.number}</Text><Text variant="caption" muted numberOfLines={2}>{title}</Text>
          {!!episode.date && <Text variant="caption" muted>{episode.date}</Text>}
          {(current || progress > 0) && <Text variant="caption">{t(current ? 'nowPlaying' : watched ? 'watched' : 'inProgress')}</Text>}
        </View>
        <Icon name={watched ? 'checkmark-circle-outline' : 'play-circle-outline'} size={24} color={current ? colors.accent : colors.text} />
      </View>
      {progress > 0 && !watched && <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={{ height: 4, backgroundColor: colors.line }}><View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: colors.brand }} /></View>}
    </View>
  </Button>;
}

export function EpisodeThumbnail({ image, progress }: { image?: string | null; progress?: number }) {
  return <View style={{ width: 128, height: 72, borderRadius: 6, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {image && <Image source={image} contentFit="cover" style={{ position: 'absolute', inset: 0 }} />}
    <View style={{ borderRadius: 20, backgroundColor: '#13151C99', padding: 6 }}><Icon name="play" size={22} color={colors.text} /></View>
    {progress !== undefined && <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: colors.line }}><View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: colors.brand }} /></View>}
  </View>;
}
