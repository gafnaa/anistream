import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme';
import { t } from '@/i18n';
import { PlayerButton } from './PlayerButton';
import { useSkipTimes } from '@/api';

const AUTOPLAY_NEXT = true;
// expo-video exposes seeking through a mutable native player property.
function seekTo(player: VideoPlayer, position: number) {
  player.currentTime = Math.max(0, Math.min(player.duration, position));
}
function Awake() {
  useKeepAwake(undefined, { suppressDeactivateWarnings: true });
  return null;
}
function time(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function NativePlayer({ url, type, resume, onSave, onError, onNext, children, previewNext = false, seriesTitle, episodeNumber }: {
  url: string; type: 'hls' | 'mp4'; resume: number; onSave: (position: number, duration: number) => void;
  onError: () => void; onNext?: () => void; children: React.ReactNode; previewNext?: boolean;
  seriesTitle?: string | null; episodeNumber?: number;
}) {
  const [initialResume] = useState(resume);
  const scrubberWidth = useRef(1);
  const player = useVideoPlayer({ uri: url, contentType: type === 'hls' ? 'hls' : 'progressive' }, value => {
    value.timeUpdateEventInterval = 0.5;
  });
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const skipTimes = useSkipTimes(seriesTitle, episodeNumber, duration);
  const skipInterval = skipTimes.data?.intervals.find(interval => position >= interval.start && position < interval.end);
  const fallbackSkip = duration > 0 && position < 300 && !skipTimes.isFetching && !skipTimes.data?.intervals.length;
  const skipLabel = skipInterval ? t(skipInterval.type === 'op' ? 'skipIntro' : skipInterval.type === 'ed' ? 'skipEnding' : 'skipRecap') : t('skipForward85');
  const [visible, setVisible] = useState(true);
  const [ripple, setRipple] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const lastTap = useRef({ side: -1, at: 0 });
  const lastProgress = useRef(0);
  const lastPosition = useRef(0);
  const save = useRef(onSave);
  useEffect(() => { save.current = onSave; }, [onSave]);
  useFocusEffect(useCallback(() => () => {
    save.current(player.currentTime, player.duration);
    player.pause();
  }, [player]));
  const upNext = !!onNext && !cancelled && AUTOPLAY_NEXT && (previewNext || (duration > 30 && position >= duration - 30));
  useEffect(() => {
    lastProgress.current = Date.now();
    let initialized = false;
    const initialize = (duration: number) => {
      if (initialized || !Number.isFinite(duration) || duration <= 0) return;
      initialized = true;
      setDuration(duration);
      setBuffering(false);
      seekTo(player, initialResume > 0 && initialResume < duration - 30 ? initialResume : 0);
      player.play();
    };
    const subscriptions = [
      player.addListener('sourceLoad', event => {
        initialize(event.duration);
      }),
      player.addListener('statusChange', event => {
        setBuffering(event.status === 'loading');
        if (event.status === 'error') onError();
      }),
      player.addListener('playingChange', event => {
        setPlaying(event.isPlaying);
        lastProgress.current = Date.now();
        if (!event.isPlaying) {
          setVisible(true);
          save.current(player.currentTime, player.duration);
        }
      }),
      player.addListener('timeUpdate', event => {
        initialize(player.duration);
        setPosition(event.currentTime);
        if (Math.abs(event.currentTime - lastPosition.current) > 0.1) lastProgress.current = Date.now();
        lastPosition.current = event.currentTime;
      }),
    ];
    player.play();
    let lastSave = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - lastSave >= 5000) {
        save.current(player.currentTime, player.duration);
        lastSave = Date.now();
      }
      if ((player.playing || player.status === 'loading') && Date.now() - lastProgress.current >= 15000) onError();
    }, 1000);
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') save.current(player.currentTime, player.duration);
    });
    return () => {
      save.current(player.currentTime, player.duration);
      clearInterval(interval);
      app.remove();
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [player, initialResume, onError]);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [playing, visible]);
  useEffect(() => {
    if (!upNext || (!playing && !previewNext)) return;
    const timer = setInterval(() => setCountdown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [upNext, playing, previewNext]);
  useEffect(() => {
    if (countdown === 0 && upNext) onNext?.();
  }, [countdown, upNext, onNext]);
  useEffect(() => {
    if (!ripple) return;
    const timer = setTimeout(() => setRipple(0), 650);
    return () => clearTimeout(timer);
  }, [ripple]);
  const seek = useCallback((offset: number) => {
    seekTo(player, player.currentTime + offset);
    setVisible(true);
    setRipple(offset);
  }, [player]);
  return <View style={StyleSheet.absoluteFill}>
    {playing && <Awake />}
    <VideoView player={player} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} nativeControls={false} contentFit="contain" allowsPictureInPicture />
    <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
      {[0, 1, 2].map(side => <Pressable key={side} accessibilityRole="button"
        accessibilityLabel={side === 0 ? t('seekBack') : side === 2 ? t('seekForward') : t('toggleControls')}
        onAccessibilityTap={() => side === 1 ? setVisible(true) : seek(side === 0 ? -10 : 10)}
        style={{ flex: 1 }} onPress={() => {
          const now = Date.now();
          if (side !== 1 && lastTap.current.side === side && now - lastTap.current.at < 320) seek(side === 0 ? -10 : 10);
          else setVisible(value => !value);
          lastTap.current = { side, at: now };
        }} />)}
    </View>
    {buffering && <ActivityIndicator pointerEvents="none" color={colors.text} style={StyleSheet.absoluteFill} />}
    {!!ripple && <View pointerEvents="none" style={{ position: 'absolute', top: '38%', left: ripple < 0 ? '12%' : '70%', backgroundColor: '#FFFFFF33', borderRadius: 48, padding: 18 }}><Text tabular>{ripple > 0 ? '+10' : '−10'}</Text></View>}
    {(skipInterval || fallbackSkip) && <Pressable accessibilityRole="button" accessibilityLabel={skipLabel}
      onPress={() => {
        const target = Math.min(duration, skipInterval?.end ?? player.currentTime + 85);
        seekTo(player, target);
        setPosition(target);
      }} style={({ pressed }) => ({ position: 'absolute', right: 16, bottom: upNext ? 156 : 80, minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1, zIndex: 2 })}>
      <View style={{ height: skipInterval ? 40 : 32, borderRadius: 20, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: 'rgba(11,13,18,0.85)' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 14 }}>{skipLabel}</Text>
      </View>
    </Pressable>}
    {visible && <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {children}
      <View style={{ position: 'absolute', top: '38%', alignSelf: 'center' }}>
        <PlayerButton icon={playing ? 'pause' : 'play'} label={t(playing ? 'pausePlayback' : 'play')}
          onPress={() => playing ? player.pause() : player.play()} />
      </View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, backgroundColor: 'rgba(11,13,18,0.9)' }}>
        <Pressable accessibilityRole="adjustable" accessibilityLabel={t('seek')}
          accessibilityValue={{ min: 0, max: duration, now: position, text: time(position) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event => seek(event.nativeEvent.actionName === 'increment' ? 10 : -10)}
          onKeyDown={event => {
            if (event.nativeEvent.key === 'ArrowRight') seek(10);
            if (event.nativeEvent.key === 'ArrowLeft') seek(-10);
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={event => {
            seekTo(player, event.nativeEvent.locationX / scrubberWidth.current * duration);
            setVisible(true);
          }}
          onLayout={event => { scrubberWidth.current = event.nativeEvent.layout.width; }}
          onPress={event => {
            seekTo(player, event.nativeEvent.locationX / scrubberWidth.current * duration);
          }} style={{ height: 48, justifyContent: 'center' }}>
          <View style={{ height: 4, backgroundColor: '#9299AD' }}><View style={{ height: 4, width: `${duration ? position / duration * 100 : 0}%`, backgroundColor: colors.brand }} /></View>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 8 }}>
          <Text variant="caption" tabular>{time(position)}</Text><Text variant="caption" tabular>−{time(duration - position)}</Text>
        </View>
      </View>
    </View>}
    {upNext && <View style={{ position: 'absolute', right: 16, bottom: 76, padding: 12, borderRadius: 10, backgroundColor: colors.surface, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: colors.brand, borderTopColor: countdown < 8 ? colors.line : colors.brand, borderRightColor: countdown < 5 ? colors.line : colors.brand, borderBottomColor: countdown < 3 ? colors.line : colors.brand, alignItems: 'center', justifyContent: 'center' }}><Text tabular>{countdown}</Text></View>
      <Text variant="title">{t('upNext')}</Text><Button variant="secondary" onPress={() => setCancelled(true)}><Text>{t('cancel')}</Text></Button>
    </View>}
  </View>;
}
