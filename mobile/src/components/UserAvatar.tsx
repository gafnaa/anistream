import { Blobatar } from '@blobatar/react-native';
import { View } from 'react-native';
import { useSettings, useSettingsHydrated } from '@/storage/settings';
import { colors } from '@/theme';

export function UserAvatar({ size = 48 }: { size?: number }) {
  const { profileId } = useSettings();
  const hydrated = useSettingsHydrated();
  return <View accessible={false} importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.card }}>
    {hydrated && profileId && <Blobatar name={profileId} size={size} />}
  </View>;
}
