import { View } from 'react-native';
import { Screen } from '@/components/Screen';
import { PosterSkeleton, SkeletonBox, SkeletonMotionControl } from '@/components/skeleton';
import { spacing } from '@/theme';
import { t } from '@/i18n';
export default function Discover() {
  return <Screen title={t('discover')}><SkeletonMotionControl><SkeletonBox height={48} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {[0, 1, 2, 3, 4, 5].map(i => <PosterSkeleton key={i} width="30%" />)}
    </View></SkeletonMotionControl></Screen>;
}
