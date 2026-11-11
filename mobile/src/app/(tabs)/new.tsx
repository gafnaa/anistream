import { Screen } from '@/components/Screen';
import { ListItemSkeleton, SkeletonMotionControl } from '@/components/skeleton';
import { t } from '@/i18n';
export default function New() {
  return <Screen title={t('new')}><SkeletonMotionControl>{[0, 1, 2, 3, 4].map(i => <ListItemSkeleton key={i} />)}</SkeletonMotionControl></Screen>;
}
