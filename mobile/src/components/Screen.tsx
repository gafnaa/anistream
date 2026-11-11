import { AmbientBackground } from '@/components/AmbientBackground';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { colors, spacing, type TextVariant } from '@/theme';
import { useTabBarInset } from './GlassTabBar';
import { t } from '@/i18n';

export function Screen({ title, children, preview = true, titleVariant = 'h1' }: PropsWithChildren<{ title: string; preview?: boolean; titleVariant?: TextVariant }>) {
  const bottom = useTabBarInset();
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <AmbientBackground /><ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom }]}>
      <View style={styles.heading}><Text variant={titleVariant} accessibilityRole="header">{title}</Text>
        {preview && <Text muted>{t('placeholder')}</Text>}</View>
      {children}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  heading: { gap: spacing.sm },
});
