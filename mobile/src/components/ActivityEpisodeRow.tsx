import { View } from 'react-native';
import { Press } from '@/components/Press';
import { EpisodeThumbnail } from './EpisodeRow';
import { router } from 'expo-router';
import { Text } from './Text';
import Icon from './Icon';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function ActivityEpisodeRow({ slug, title, episode, image, meta, progress, onRemove }: {
  slug: string; title: string; episode: string; image: string | null; meta: string;
  progress?: number; onRemove?: () => void;
}) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }}>
    <Press accessibilityRole="button" accessibilityLabel={`${title}, ${t('episodeLabel')} ${episode}`} onLongPress={onRemove}
      onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug } })}
      style={({ pressed }) => ({ flexDirection: 'row', flex: 1, alignItems: 'center', gap: 16, opacity: pressed ? 0.7 : 1 })}>
      <EpisodeThumbnail slug={slug} image={image} progress={progress} />
      <View style={{ flex: 1, gap: 6 }}><Text variant="title" numberOfLines={2}>{title}</Text><Text variant="caption" muted>{t('episodeLabel')} {episode}</Text><Text variant="caption" muted>{meta}</Text></View>
    </Press>
    {onRemove && <Press accessibilityRole="button" accessibilityLabel={`${t('removeHistory')}: ${title}`} onPress={onRemove} style={({ pressed }) => ({ width: 48, height: 48, position: 'absolute', right: -20, top: -12, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}><Icon name="close" size={14} color={colors.muted} /></Press>}

  </View>;
}
