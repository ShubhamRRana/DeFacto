import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Linking, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { colors, typography, spacing, borderRadius } from '../theme/colors';

const { width, height } = Dimensions.get('window');

export default function FactCard({ fact, isBookmarked, isLiked, onBookmark, onLike, onShare }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateButton = (callback) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(callback);
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateButton(() => onLike(fact.id));
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBookmark(fact.id);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = `"${fact.content}"\n\nSource: ${fact.source_name}\n\nDiscover more facts on De'Facto!`;
    try {
      await Sharing.shareAsync('', { dialogTitle: 'Share this fact', message });
    } catch {
      // Sharing not available on all platforms — silently skip
    }
    onShare?.(fact.id);
  };

  const handleSourcePress = () => {
    if (fact.source_url) Linking.openURL(fact.source_url);
  };

  const topicColor = fact.topics?.color ?? colors.primary;

  return (
    <View style={styles.card}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative glow behind fact */}
      <View style={[styles.glow, { backgroundColor: topicColor }]} />

      {/* Topic chip */}
      <View style={styles.topSection}>
        <View style={[styles.topicChip, { backgroundColor: topicColor + '22', borderColor: topicColor + '55' }]}>
          <Ionicons name={fact.topics?.icon ?? 'flash'} size={14} color={topicColor} />
          <Text style={[styles.topicName, { color: topicColor }]}>{fact.topics?.name}</Text>
        </View>
      </View>

      {/* Fact content */}
      <View style={styles.contentSection}>
        <Text style={styles.quoteSymbol}>"</Text>
        <Text style={styles.factText}>{fact.content}</Text>
      </View>

      {/* Source */}
      {fact.source_name && (
        <TouchableOpacity style={styles.sourceRow} onPress={handleSourcePress} activeOpacity={0.7}>
          <Ionicons name="link-outline" size={13} color={colors.textMuted} />
          <Text style={styles.sourceText}>Source: {fact.source_name}</Text>
          <Ionicons name="open-outline" size={12} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <Ionicons name="chevron-up" size={16} color={colors.textMuted} />
        <Text style={styles.swipeHintText}>Swipe for next fact</Text>
      </View>

      {/* Action buttons (right side) */}
      <View style={styles.actions}>
        {/* Like */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.8}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? colors.secondary : colors.textSecondary}
            />
            <Text style={[styles.actionLabel, isLiked && { color: colors.secondary }]}>
              {isLiked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bookmark */}
        <TouchableOpacity style={styles.actionButton} onPress={handleBookmark} activeOpacity={0.8}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={isBookmarked ? colors.gold : colors.textSecondary}
          />
          <Text style={[styles.actionLabel, isBookmarked && { color: colors.gold }]}>
            {isBookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={26} color={colors.textSecondary} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width,
    height,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.05,
    top: '30%',
    left: '50%',
    transform: [{ translateX: -140 }],
  },
  topSection: {
    position: 'absolute',
    top: 110,
    left: spacing.lg,
    right: 80,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  topicName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  contentSection: {
    marginRight: 64,
    marginTop: 40,
  },
  quoteSymbol: {
    fontSize: 80,
    color: colors.primary,
    opacity: 0.3,
    lineHeight: 70,
    fontWeight: typography.fontWeights.extrabold,
    marginBottom: -10,
  },
  factText: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.lg,
    marginRight: 64,
  },
  sourceText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    flex: 1,
    textDecorationLine: 'underline',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 64,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    opacity: 0.5,
  },
  swipeHintText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  actions: {
    position: 'absolute',
    right: spacing.md,
    bottom: 120,
    gap: spacing.lg,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
});
