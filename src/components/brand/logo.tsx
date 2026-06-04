import { Image, StyleSheet, View } from 'react-native';

const brandIconSource = require('@/assets/images/subastar-logo-icon.png');
const brandWordmarkSource = require('@/assets/images/subastar-wordmark.png');

export function BrandIcon({ size = 80 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="Logo SubastAR"
      source={brandIconSource}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      resizeMode="contain"
    />
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      accessibilityLabel="SubastAR"
      source={brandWordmarkSource}
      style={compact ? styles.wordmarkCompact : styles.wordmark}
      resizeMode="contain"
    />
  );
}

export function BrandLogo({ iconSize = 88, centered = true }: { iconSize?: number; centered?: boolean }) {
  return (
    <View style={[styles.lockup, centered && styles.lockupCentered]}>
      <BrandIcon size={iconSize} />
      <BrandWordmark />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center', gap: 10 },
  lockupCentered: { alignSelf: 'center' },
  wordmark: { width: 240, height: 58 },
  wordmarkCompact: { width: 92, height: 24 },
});
