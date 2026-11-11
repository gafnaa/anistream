import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { RowSkeleton, SkeletonText, SkeletonMotionControl } from '@/components/skeleton';
import { colors, radius, spacing } from '@/theme';
import { t } from '@/i18n';
export default function Me() {
  return <Screen title={t('me')}>
    {__DEV__ && <Link href="/dev/design" asChild><Pressable accessibilityRole="link"
      style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', padding: spacing.md,
        borderRadius: radius.chip, backgroundColor: pressed ? colors['card-2'] : colors.card })}>
      <Text>{t('design')}</Text></Pressable></Link>}
    <SkeletonMotionControl><SkeletonText lines={2} /><RowSkeleton /></SkeletonMotionControl>
  </Screen>;
}
