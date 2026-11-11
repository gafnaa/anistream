import { Screen } from '@/components/Screen';
import { ListItemSkeleton, SkeletonText, SkeletonMotionControl } from '@/components/skeleton';
import { t } from '@/i18n';
export default function History() {
  return <Screen title={t('history')}><SkeletonMotionControl><SkeletonText lines={1} />
    {[0, 1, 2].map(i => <ListItemSkeleton key={i} />)}</SkeletonMotionControl></Screen>;
}
