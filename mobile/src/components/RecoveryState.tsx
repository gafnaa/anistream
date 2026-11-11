import { View } from 'react-native';
import { FileQuestion, Search, WifiOff } from 'lucide-react-native';
import { Text } from './Text';
import { ActionButton } from './ActionButton';
import { colors } from '@/theme';
export function RecoveryState({ title, description, kind = 'offline', action, label, secondary, secondaryLabel }: {
  title: string; description: string; kind?: 'offline' | 'search' | 'missing'; action: () => void; label: string;
  secondary?: () => void; secondaryLabel?: string;
}) {
  const Icon = kind === 'offline' ? WifiOff : kind === 'search' ? Search : FileQuestion;
  return <View style={{ flex: 1, minHeight: 480, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
    <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><Icon size={36} color={colors['text-muted']} /></View>
    <Text variant="h1" style={{ textAlign: 'center' }}>{title}</Text>
    <Text muted style={{ textAlign: 'center', marginBottom: 16 }}>{description}</Text>
    <ActionButton primary label={label} onPress={action} />
    {secondary && secondaryLabel && <ActionButton variant="outline" label={secondaryLabel} onPress={secondary} />}
  </View>;
}
