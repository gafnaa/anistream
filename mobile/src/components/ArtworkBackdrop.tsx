import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/theme';

export function ArtworkBackdrop({ source, children }: PropsWithChildren<{ source: string | null }>) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <Image source={source} blurRadius={28} contentFit="cover"
      style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.12 }] }]} />
    {children}
    <LinearGradient colors={[...gradients.heroScrim, colors.bg]} locations={[0, 0.65, 1]} style={StyleSheet.absoluteFill} />
  </View>;
}
