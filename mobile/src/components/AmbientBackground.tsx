import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { backgroundGradient } from '@/theme';

export function AmbientBackground() {
  return <LinearGradient pointerEvents="none" colors={backgroundGradient}
    locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />;
}
