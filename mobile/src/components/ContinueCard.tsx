import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { RemovalDialog } from './RemovalDialog';
import { removeHistory, type HistoryItem } from '@/storage';
import { colors, radius } from '@/theme';
import { t } from '@/i18n';

export function ContinueCard({ item }: { item: HistoryItem }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState(false);
  const progress = item.duration > 0 ? Math.min(1, Math.max(0, item.position / item.duration)) : 0;
  return <View style={{ width: 216 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, E${item.episode}, ${t('continueWatching')}`}
      accessibilityHint={t('historyHint')} onLongPress={() => setMenu(true)}
      onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug: item.episodeSlug } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, gap: 8 })}>
      <View style={{ height: 121.5, backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' }}>
        <Image source={item.poster} transition={200} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: colors.line }}>
          <View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: colors.brand }} />
        </View>
      </View>
      <Text variant="title">{item.title}</Text>
      <Text variant="caption" muted tabular>E{item.episode} · {Math.ceil(Math.max(0, item.duration - item.position) / 60)} {t('minutesLeft')}</Text>
    </Pressable>
    <RemovalDialog open={menu} onOpenChange={setMenu} title={t('removeHistory')} description={item.title}
      error={error} onRemove={() => {
        setError(false);
        void removeHistory(item.episodeSlug).then(() => setMenu(false)).catch(() => setError(true));
      }} />
  </View>;
}
