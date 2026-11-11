import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, createRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { GlassTabBar, TabBlurTarget } from '@/components/GlassTabBar';
import { colors } from '@/theme';
import { t, type TranslationKey } from '@/i18n';

const tabs = [
  { name: 'index', label: 'home', icon: 'home-outline' },
  { name: 'discover', label: 'discover', icon: 'search-outline' },
  { name: 'new', label: 'new', icon: 'play-circle-outline' },
  { name: 'history', label: 'history', icon: 'time-outline' },
  { name: 'me', label: 'me', icon: 'person-outline' },
] as const satisfies readonly { name: string; label: TranslationKey; icon: keyof typeof Ionicons.glyphMap }[];
export default function TabLayout() {
  const [targets] = useState(() => Object.fromEntries(tabs.map(tab => [tab.name, createRef<ComponentRef<typeof View>>()])));
  return <TabBlurTarget.Provider value={targets}><Tabs tabBar={props => <GlassTabBar {...props} />}
    screenLayout={({ children, route }) => {
      const target = targets[route.name];
      return <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>;
    }}
    screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
    {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.label),
      tabBarAccessibilityLabel: t(tab.label),
      tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={typeof color === 'string' ? color : colors.text} size={size} accessible={false} /> }} />)}
  </Tabs></TabBlurTarget.Provider>;
}
