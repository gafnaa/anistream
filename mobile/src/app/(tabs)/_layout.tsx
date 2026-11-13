import { Tabs } from 'expo-router';
import { SwipeTabScreen } from '@/components/SwipeTabScreen';
import Icon from '@/components/Icon';
import { useState, createRef, type ComponentRef } from 'react';
import { Easing, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
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
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [targets] = useState(() => Object.fromEntries(tabs.map(tab => [tab.name, createRef<ComponentRef<typeof View>>()])));
  return <TabBlurTarget.Provider value={targets}><Tabs tabBar={props => <GlassTabBar {...props} />}
    screenLayout={({ children, route }) => {
      const target = targets[route.name];
      return <SwipeTabScreen index={tabs.findIndex(tab => tab.name === route.name)}>
        <BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView>
      </SwipeTabScreen>;
    }}
    screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg },
      animation: reducedMotion ? 'none' : 'shift',
      transitionSpec: { animation: 'timing', config: { duration: reducedMotion ? 0 : 260, easing: Easing.out(Easing.cubic) } },
      sceneStyleInterpolator: ({ current }) => ({ sceneStyle: { transform: [{ translateX: current.progress.interpolate({
        inputRange: [-1, 0, 1], outputRange: [-width, 0, width], extrapolate: 'clamp',
      }) }] } }),
    }}>
    {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.label),
      tabBarAccessibilityLabel: t(tab.label),
      tabBarIcon: ({ focused, color, size }) => <Icon name={focused ? tab.activeIcon : tab.icon} color={typeof color === 'string' ? color : colors.text} size={size} accessible={false} /> }} />)}
  </Tabs></TabBlurTarget.Provider>;
}
