import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PanResponder, View } from 'react-native';
import { router } from 'expo-router';

const paths = ['/', '/discover', '/new', '/history', '/me'] as const;
const BlockTabSwipe = createContext(() => {});
export const useBlockTabSwipe = () => useContext(BlockTabSwipe);

function createSwipeResponder(index: number) {
  let blocked = false;
  const pan = PanResponder.create({
    onStartShouldSetPanResponderCapture: () => { blocked = false; return false; },
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      if (Math.abs(gesture.dy) > 16 || gesture.numberActiveTouches !== 1) blocked = true;
      return !blocked && Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2;
    },
    onPanResponderRelease: (_, gesture) => {
      if (blocked || Math.abs(gesture.dy) > Math.abs(gesture.dx) / 2) return;
      if (Math.abs(gesture.dx) < 64 && !(Math.abs(gesture.dx) >= 32 && Math.abs(gesture.vx) > 0.5)) return;
      const next = index + (gesture.dx < 0 ? 1 : -1);
      if (next >= 0 && next < paths.length) router.navigate(paths[next]);
    },
    onPanResponderStart: (_, gesture) => { if (gesture.numberActiveTouches > 1) blocked = true; },
    onPanResponderTerminationRequest: () => true,
  });
  return { ...pan, block: () => { blocked = true; } };
}

export function SwipeTabScreen({ index, children }: { index: number; children: ReactNode }) {
  const responder = useMemo(() => createSwipeResponder(index), [index]);
  return <BlockTabSwipe.Provider value={responder.block}>
    <View style={{ flex: 1 }} {...responder.panHandlers}>{children}</View>
  </BlockTabSwipe.Provider>;
}
