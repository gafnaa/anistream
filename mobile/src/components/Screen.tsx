import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';
import { useTabBarInset } from './GlassTabBar';
import { t } from '@/i18n';

export function Screen({ title, children, preview = true }: PropsWithChildren<{ title: string; preview?: boolean }>) {
  const bottom = useTabBarInset();
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <View style={styles.heading}><Text variant="h1" accessibilityRole="header">{title}</Text>
        {preview && <Text muted>{t('placeholder')}</Text>}</View>
      {children}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  heading: { gap: spacing.sm },
});
