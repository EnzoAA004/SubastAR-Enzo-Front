import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '@/constants/theme';

type LotImageCarouselProps = {
  images?: string[];
  title?: string;
  height?: number;
};

export function LotImageCarousel({ images, title, height = 260 }: LotImageCarouselProps) {
  const validImages = useMemo(() => (images ?? []).filter(Boolean), [images]);
  const [index, setIndex] = useState(0);
  const hasImages = validImages.length > 0;
  const hasMultipleImages = validImages.length > 1;
  const currentImage = validImages[index] ?? validImages[0];

  useEffect(() => {
    if (index >= validImages.length) setIndex(0);
  }, [index, validImages.length]);

  useEffect(() => {
    if (!hasMultipleImages) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % validImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [hasMultipleImages, validImages.length]);

  function previous() {
    setIndex((current) => (current - 1 + validImages.length) % validImages.length);
  }

  function next() {
    setIndex((current) => (current + 1) % validImages.length);
  }

  if (!hasImages) {
    return (
      <View style={[styles.carouselFrame, styles.placeholder, { height }]}>
        <Ionicons name="image-outline" size={42} color={colors.primary} />
        <Text style={styles.placeholderText}>{title ?? 'Imagen del lote'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.carouselFrame, { height }]}>
        <Image source={{ uri: currentImage }} style={styles.carouselImage} resizeMode="cover" />
        {hasMultipleImages ? <View style={styles.imageCountBadge}><Text style={styles.imageCountText}>{validImages.length} fotos</Text></View> : null}
        {hasMultipleImages ? (
          <>
            <Pressable style={[styles.carouselButton, styles.carouselButtonLeft]} onPress={previous} accessibilityRole="button" accessibilityLabel="Imagen anterior">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <Pressable style={[styles.carouselButton, styles.carouselButtonRight]} onPress={next} accessibilityRole="button" accessibilityLabel="Imagen siguiente">
              <Ionicons name="chevron-forward" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.carouselDots}>
              {validImages.map((image, dotIndex) => (
                <Pressable
                  key={`${image}-${dotIndex}`}
                  style={[styles.carouselDot, dotIndex === index && styles.carouselDotActive]}
                  onPress={() => setIndex(dotIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver imagen ${dotIndex + 1}`}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
      {hasMultipleImages ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
          {validImages.map((image, thumbIndex) => (
            <Pressable
              key={`${image}-thumb-${thumbIndex}`}
              onPress={() => setIndex(thumbIndex)}
              style={[styles.thumbnailButton, thumbIndex === index && styles.thumbnailButtonActive]}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar imagen ${thumbIndex + 1}`}
            >
              <Image source={{ uri: image }} style={styles.thumbnail} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  carouselFrame: { position: 'relative', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  carouselImage: { width: '100%', height: '100%', borderRadius: radius.lg },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  placeholderText: { color: colors.textMuted, fontSize: typography.bodySmall, fontFamily: fonts.medium },
  carouselButton: { position: 'absolute', top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,23,0.55)' },
  carouselButtonLeft: { left: spacing.md },
  carouselButtonRight: { right: spacing.md },
  carouselDots: { position: 'absolute', bottom: spacing.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  carouselDotActive: { width: 22, backgroundColor: '#FFF' },
  imageCountBadge: { position: 'absolute', top: spacing.md, right: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: 'rgba(17,17,23,0.65)' },
  imageCountText: { color: '#FFF', fontSize: typography.caption, fontFamily: fonts.bold },
  thumbnailRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumbnailButton: { borderWidth: 2, borderColor: 'transparent', borderRadius: radius.md, padding: 2 },
  thumbnailButtonActive: { borderColor: colors.primary },
  thumbnail: { width: 58, height: 58, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
});
