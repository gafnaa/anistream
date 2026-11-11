import { ArrowLeft, ArrowDownUp, Check, CheckCircle, ChevronLeft, ChevronRight, Circle, CirclePlay, Compass, Expand, History, House, Minimize, Pause, Play, Search, Server, Share2, SkipBack, SkipForward, Sparkles, UserRound, Volume2, VolumeX, X, type LucideProps } from 'lucide-react-native';
const icons = {
  'arrow-back': ArrowLeft, 'chevron-back': ChevronLeft, 'chevron-forward': ChevronRight,
  'search-outline': Search, close: X, 'time-outline': History, time: History,
  'home-outline': House, home: House, 'compass-outline': Compass, compass: Compass,
  'play-circle-outline': CirclePlay, 'play-circle': CirclePlay, sparkles: Sparkles, 'person-outline': UserRound, person: UserRound,
  'share-outline': Share2, 'server-outline': Server, 'play-skip-back': SkipBack,
  'play-skip-forward': SkipForward, play: Play, pause: Pause, expand: Expand, contract: Minimize,
  'checkmark-circle-outline': CheckCircle, checkmark: Check, 'swap-vertical': ArrowDownUp,
  'volume-high': Volume2, 'volume-mute': VolumeX,
};
export default function Icon({ name, ...props }: LucideProps & { name: string }) {
  const Component = icons[name as keyof typeof icons] ?? Circle;
  return <Component size={24} strokeWidth={2} {...props} />;
}
