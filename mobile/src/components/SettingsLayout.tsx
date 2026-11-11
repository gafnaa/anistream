import type { PropsWithChildren } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { ActivityLayout } from './ActivityLayout';
import { BrowseNavigation } from './BrowseNavigation';
import { Text } from './Text';
import { Button } from './ui/button';
import { colors } from '@/theme';
import { t } from '@/i18n';

export function SettingsLayout({ title, children }: PropsWithChildren<{ title: string }>) {
  return <ActivityLayout><ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, paddingBottom: 120, gap: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, marginLeft: -12 }}>
      <Button variant="ghost" size="icon" accessibilityLabel={t('back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/me')}><ArrowLeft size={24} color={colors.text} /></Button>
      <Text variant="h2" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
    </View>{children}</ScrollView><BrowseNavigation selected="me" /></ActivityLayout>;
}
export function SettingsRow({ label, hint, onPress, children, icon, destructive }: PropsWithChildren<{ label: string; hint?: string; onPress?: () => void; icon?: React.ReactNode; destructive?: boolean }>) {
  const content = <>{icon}<View style={{ flex: 1, gap: 6 }}><Text>{label}</Text>{hint && <Text variant="caption" muted>{hint}</Text>}</View>{children}{onPress && (destructive ? <Trash2 size={22} color={colors['text-muted']} /> : <ChevronRight size={22} color={colors['text-muted']} />)}</>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, opacity: pressed ? 0.65 : 1 })}>{content}</Pressable>
    : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64 }}>{content}</View>;
}
export function SettingsDivider() { return <View style={{ height: 1, backgroundColor: colors.line }} />; }
