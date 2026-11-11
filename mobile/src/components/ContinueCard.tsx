import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Modal, Pressable, View } from 'react-native';
import { Text } from './Text';
import { ActionButton } from './ActionButton';
import { removeHistory, type HistoryItem } from '@/storage';
import { colors, radius } from '@/theme';
import { t } from '@/i18n';

export function ContinueCard({ item }: { item: HistoryItem }) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState(false);
  const progress = item.duration > 0 ? Math.min(1, Math.max(0, item.position / item.duration)) : 0;
  return <View style={{ width: 240 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, E${item.episode}, ${t('continueWatching')}`}
      accessibilityHint={t('historyHint')} onLongPress={() => setMenu(true)}
      onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug: item.episodeSlug } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, gap: 8 })}>
      <View style={{ height: 135, backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' }}>
        <Image source={item.poster} transition={200} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: colors.line }}>
          <View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: colors.brand }} />
        </View>
      </View>
      <Text variant="title">{item.title}</Text>
      <Text variant="caption" muted tabular>E{item.episode} · {Math.ceil(Math.max(0, item.duration - item.position) / 60)} {t('minutesLeft')}</Text>
    </Pressable>
    <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}>
      <View style={{ flex: 1, backgroundColor: '#000B', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, padding: 24, borderRadius: radius.sheet, gap: 16 }}>
          <Text variant="h2">{t('removeHistory')}</Text><Text>{item.title}</Text>
          {error && <Text>{t('storageError')}</Text>}
          <ActionButton label={t('removeHistory')} onPress={() => {
            void removeHistory(item.episodeSlug).then(() => setMenu(false)).catch(() => setError(true));
          }} />
          <ActionButton label={t('cancel')} onPress={() => setMenu(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
