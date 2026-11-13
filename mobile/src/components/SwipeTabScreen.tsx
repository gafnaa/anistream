import { useCallback, createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { integrateWithRouter, TabRouter } from 'expo-router';
import { createJSTabsProps, type BottomTabNavigationOptions, type BottomTabNavigationEventMap } from 'expo-router/js-tabs';
import type { ParamListBase, TabNavigationState, TabRouterOptions } from 'expo-router/react-navigation';
import { createStandardNavigator, type NavigatorArgs } from 'standard-navigation';
import { GlassTabBar } from './GlassTabBar';
import { colors } from '@/theme';

const BlockTabSwipe = createContext(() => {});
export const useBlockTabSwipe = () => useContext(BlockTabSwipe);

function Page({ index, position, width, focused, children }: {
  index: number; position: SharedValue<number>; width: number; focused: boolean; children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (index - position.value) * width }] }));
  return <Animated.View pointerEvents={focused ? 'auto' : 'none'} aria-hidden={!focused} accessibilityElementsHidden={!focused}
    importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'} style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

type PagerProps = ReturnType<typeof createJSTabsProps>;

function Pager({ state, descriptors, actions, emitter, preload }: NavigatorArgs<BottomTabNavigationOptions, BottomTabNavigationEventMap> & PagerProps) {
  // Mount neighbours before a drag so the incoming page is already drawable.
  const preloaded = useRef(new Set<string>());
  useEffect(() => {
    for (const route of state.routes) {
      if (!preloaded.current.has(route.name)) {
        preloaded.current.add(route.name);
        preload(route.name);
      }
    }
  }, [state.routes, preload]);
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const position = useSharedValue(state.index);
  const start = useSharedValue(state.index);
  const blocked = useSharedValue(false);
  const dragging = useSharedValue(false);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const navigate = useCallback((index: number) => {
    const route = state.routes[index];
    if (route) actions.navigate(route.name, route.params);
  }, [state.routes, actions]);
  useEffect(() => {
    position.set(reducedMotion ? state.index : withSpring(state.index, { damping: 24, stiffness: 240, mass: 0.8, overshootClamping: true }));
  }, [state.index, reducedMotion, position]);
  const pan = Gesture.Pan().manualActivation(true).maxPointers(1)
    .onTouchesDown(event => {
      blocked.value = false;
      originX.value = event.allTouches[0]?.absoluteX ?? 0;
      originY.value = event.allTouches[0]?.absoluteY ?? 0;
    })
    .onTouchesMove((event, manager) => {
      if (dragging.value) return;
      const touch = event.allTouches[0];
      if (!touch || blocked.value || event.numberOfTouches !== 1) { manager.fail(); return; }
      const dx = Math.abs(touch.absoluteX - originX.value);
      const dy = Math.abs(touch.absoluteY - originY.value);
      if (dy > 12) manager.fail();
      else if (dx > 24 && dx > dy * 2) manager.activate();
    })
    .onStart(() => {
      if (blocked.value) return;
      cancelAnimation(position);
      start.value = position.value;
      dragging.value = true;
    })
    .onUpdate(event => {
      if (blocked.value || !dragging.value) return;
      const next = start.value - event.translationX / width;
      position.set(Math.max(0, Math.min(state.routes.length - 1, next)));
    })
    .onEnd(event => {
      if (blocked.value || !dragging.value) return;
      const delta = -event.translationX / width;
      const direction = delta + -event.velocityX / width * 0.15;
      const target = Math.max(0, Math.min(state.routes.length - 1,
        state.index + (Math.abs(delta) > 0.22 || Math.abs(event.velocityX) > 550 ? (direction > 0 ? 1 : -1) : 0)));
      if (reducedMotion) {
        position.set(target);
        runOnJS(navigate)(target);
      } else {
        position.set(withSpring(target, { damping: 24, stiffness: 240, mass: 0.8, overshootClamping: true, velocity: -event.velocityX / width }, finished => {
          if (finished) runOnJS(navigate)(target);
        }));
      }
    })
    .onFinalize((_event, success) => {
      if (dragging.value && (!success || blocked.value)) position.set(reducedMotion ? state.index : withSpring(state.index, { damping: 24, stiffness: 240, overshootClamping: true }));
      dragging.value = false;
    });
  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
    <BlockTabSwipe.Provider value={() => { blocked.value = true; }}>
      <GestureDetector gesture={pan}><View style={{ flex: 1, overflow: 'hidden' }}>
        {state.routes.map((route, index) => <Page key={route.key} index={index} position={position} width={width} focused={state.index === index}>
          {descriptors[route.key].render()}
        </Page>)}
      </View></GestureDetector>
    </BlockTabSwipe.Provider>
    <GlassTabBar state={state} descriptors={descriptors} emitter={emitter}
      navigateToTab={key => navigate(state.routes.findIndex(route => route.key === key))} insets={{ top: 0, bottom: 0, left: 0, right: 0 }} />
  </GestureHandlerRootView>;
}
const navigator = createStandardNavigator<BottomTabNavigationOptions, BottomTabNavigationEventMap, PagerProps>(Pager);
export const SwipeTabs = integrateWithRouter<BottomTabNavigationOptions, TabNavigationState<ParamListBase>, BottomTabNavigationEventMap, Record<never, never>, TabRouterOptions, PagerProps>(navigator, TabRouter, {
  createProps: createJSTabsProps,
  activityDefaultThreshold: Number.MAX_SAFE_INTEGER,
  // Expo Router may initially supply only the focused route; retain the declared tab order.
  processDescriptors: (descriptors, state, describe) => {
    const next = { ...descriptors };
    let changed = false;
    for (const name of state.routeNames) {
      if (!state.routes.some(route => route.name === name)) {
        next[name] = describe({ key: undefined, name });
        changed = true;
      }
    }
    return changed ? next : descriptors;
  },
  processState: (state, descriptors) => {
    const focused = state.routes[state.index]?.name;
    const routes = state.routeNames.map(name => state.routes.find(route => route.name === name)
      ?? { ...descriptors[name].route, key: name, name });
    return state.routes.length === routes.length && routes.every((route, index) => route === state.routes[index])
      ? state : { ...state, routes, index: Math.max(0, routes.findIndex(route => route.name === focused)) };
  },
});
