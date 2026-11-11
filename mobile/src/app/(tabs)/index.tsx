import { Screen } from '@/components/Screen';
import { HeroSkeleton, RowSkeleton, SkeletonMotionControl } from '@/components/skeleton';
import { t } from '@/i18n';
export default function Home() {
  return <Screen title={t('home')}><SkeletonMotionControl><HeroSkeleton /><RowSkeleton /><RowSkeleton /></SkeletonMotionControl></Screen>;
}
