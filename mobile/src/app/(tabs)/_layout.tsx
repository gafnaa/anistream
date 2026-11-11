import { Tabs } from 'expo-router';
import Icon from '@/components/Icon';
import { useState, createRef, type ComponentRef } from 'react';
import { View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { GlassTabBar, TabBlurTarget } from '@/components/GlassTabBar';
import { colors } from '@/theme';
import { t, type TranslationKey } from '@/i18n';

const tabs = [
  { name: 'index', label: 'home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'discover', label: 'discover', icon: 'compass-outline', activeIcon: 'compass' },
  { name: 'new', label: 'new', icon: 'sparkles', activeIcon: 'sparkles' },
  { name: 'history', label: 'history', icon: 'time-outline', activeIcon: 'time' },
  { name: 'me', label: 'me', icon: 'person-outline', activeIcon: 'person' },
] as const satisfies readonly { name: string; label: TranslationKey; icon: string; activeIcon: string }[];
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
      tabBarIcon: ({ focused, color, size }) => <Icon name={focused ? tab.activeIcon : tab.icon} color={typeof color === 'string' ? color : colors.text} size={size} accessible={false} /> }} />)}
  </Tabs></TabBlurTarget.Provider>;
}
