import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/theme';
import { t, type TranslationKey } from '@/i18n';
import { Text } from '@/components/Text';

const tabs = [
  { name: 'index', label: 'home', icon: 'home-outline' },
  { name: 'discover', label: 'discover', icon: 'search-outline' },
  { name: 'new', label: 'new', icon: 'play-circle-outline' },
  { name: 'history', label: 'history', icon: 'time-outline' },
  { name: 'me', label: 'me', icon: 'person-outline' },
] as const satisfies readonly { name: string; label: TranslationKey; icon: keyof typeof Ionicons.glyphMap }[];
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors['text-muted'], sceneStyle: { backgroundColor: colors.bg },
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line,
      height: 64 + insets.bottom, paddingTop: spacing.xs, paddingBottom: Math.max(insets.bottom, spacing.xs) },
    tabBarItemStyle: { minHeight: 48, marginHorizontal: spacing.xs },
    tabBarLabelStyle: { fontFamily: fonts.inter500, fontSize: 11 }, tabBarLabelPosition: 'below-icon',
    tabBarAllowFontScaling: true }}>
    {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.label),
      tabBarAccessibilityLabel: t(tab.label),
      tabBarLabel: ({ focused }) => <Text variant="caption" muted={!focused} style={{ fontSize: 11 }}>{t(tab.label)}</Text>,
      tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={typeof color === 'string' ? color : colors.text} size={size} accessible={false} /> }} />)}
  </Tabs>;
}
