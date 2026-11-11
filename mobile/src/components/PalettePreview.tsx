import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Badge, Chip } from './Chip';
import { brandRamp, colors, genreGradients, gradients, spacing, tones } from '@/theme';

export function PalettePreview() {
  return <View style={{ gap: spacing.lg }}>
    <Text variant="h2">Brand tonal ramp</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {Object.entries(brandRamp).map(([name, value]) => <View key={name} style={{ width: '47%', gap: 4 }}>
        <View style={{ height: 40, borderRadius: 6, backgroundColor: value }} />
        <Text variant="caption">{name}{'\n'}{value}</Text>
      </View>)}
    </View>
    <Text variant="h2">Status tones</Text>
    {Object.entries(tones).map(([name, tone]) => <View key={name} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: tone.solid }} />
      <Text>{name} · {tone.solid}</Text>
    </View>)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Badge label="Airing" tone="cyan" /><Badge label="New episode" tone="pink" />
      <Chip label="Watching" tone="amber" /><Chip label="Completed" tone="green" />
    </View>
    <Text variant="h2">Gradient presets</Text>
    {Object.entries(gradients).map(([name, gradient]) => <LinearGradient key={name} colors={gradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, minHeight: 80, borderRadius: 10, backgroundColor: colors.bg }}>
      <Text variant="title">{name}</Text>
    </LinearGradient>)}
    <Text variant="h2">Genre tiles</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Object.entries(genreGradients).map(([name, gradient]) => <LinearGradient key={name} colors={gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: '48%', height: 112, padding: 16, borderRadius: 10, justifyContent: 'flex-end' }}>
        <Text variant="title">{name}</Text>
      </LinearGradient>)}
    </View>
  </View>;
}
