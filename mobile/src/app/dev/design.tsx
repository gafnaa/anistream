import { useSeedHistory } from '@/storage/seed';
import { ActionButton } from '@/components/ActionButton';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { PalettePreview } from '@/components/PalettePreview';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { SkeletonBox, SkeletonText, PosterSkeleton, RowSkeleton, HeroSkeleton, ListItemSkeleton, SkeletonMotionControl } from '@/components/skeleton';
import { colors, radius, spacing, typography, type TextVariant } from '@/theme';
import { t } from '@/i18n';
export default function Design() {
  const seed = useSeedHistory();
  if (!__DEV__) return <Redirect href="/" />;
  return <Screen title={t('design')} preview={false}>
    <ActionButton label={t('seedHistory')} onPress={() => seed.mutate()} />
    {seed.isSuccess && <Text>{t('seeded')}</Text>}
    {seed.isError && <Text>{t('storageError')}</Text>}
    <Text variant="h2">{t('typography')}</Text>
    {(Object.keys(typography) as TextVariant[]).map(variant => <View key={variant} style={{ gap: spacing.xs }}>
      <Text variant="caption" muted>{variant}</Text><Text variant={variant}>{t('sample')}</Text></View>)}
    <Text muted>{t('placeholder')}</Text><Text variant="caption" tabular>12:34 · 128</Text>
    <PalettePreview />
    <Text variant="h2">{t('palette')}</Text>
    {Object.entries(colors).map(([name, value]) => <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ width: 48, height: 48, borderRadius: radius.chip, backgroundColor: value, borderWidth: 1, borderColor: colors.line }} />
      <View><Text variant="title">{name}</Text><Text variant="caption" muted>{value}</Text></View></View>)}
    <Text variant="h2">{t('skeletons')}</Text>
    <SkeletonMotionControl>
      <Text variant="title">SkeletonBox</Text><SkeletonBox height={48} />
      <Text variant="title">SkeletonText</Text><SkeletonText lines={3} />
      <Text variant="title">PosterSkeleton · 2:3</Text><PosterSkeleton />
      <Text variant="title">RowSkeleton</Text><RowSkeleton />
      <Text variant="title">HeroSkeleton</Text><HeroSkeleton />
      <Text variant="title">ListItemSkeleton</Text><ListItemSkeleton />
    </SkeletonMotionControl>
  </Screen>;
}
