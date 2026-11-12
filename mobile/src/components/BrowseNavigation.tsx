import { View } from 'react-native';
import { Press } from '@/components/Press';
import { router, type Href } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Compass, Sparkles, History, UserRound } from 'lucide-react-native';
import { colors } from '@/theme';
import { t, type TranslationKey } from '@/i18n';
const tabs = [
  { path: '/', label: 'home', Icon: House }, { path: '/discover', label: 'discover', Icon: Compass },
  { path: '/new', label: 'new', Icon: Sparkles }, { path: '/history', label: 'history', Icon: History },
  { path: '/me', label: 'me', Icon: UserRound },
] as const;
export function BrowseNavigation({ selected = 'discover' }: { selected?: TranslationKey }) {
  const insets = useSafeAreaInsets();
  return <View style={{ position: 'absolute', bottom: insets.bottom + 12, left: 16, right: 16, height: 60, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF1A' }}>
    <BlurView intensity={24} tint="dark" style={{ position: 'absolute', inset: 0 }} />
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.glass, paddingHorizontal: 8, alignItems: 'center' }}>
      {tabs.map(({path, label, Icon}) => <Press key={label} accessibilityRole="tab" accessibilityLabel={t(label)} accessibilityState={{ selected: label === selected }}
        onPress={() => router.push(path as Href)} style={({pressed}) => ({ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: label === selected ? '#F43F5E26' : 'transparent' }}><Icon size={24} color={label === selected ? colors.text : colors['text-muted']} /></View>
        {label === selected && <View style={{ position: 'absolute', bottom: 0, width: 5, height: 3, borderRadius: 2, backgroundColor: colors.brand }} />}
      </Press>)}
    </View>
  </View>;
}
