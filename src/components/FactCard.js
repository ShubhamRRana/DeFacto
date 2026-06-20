import React, { useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Dimensions, Linking, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const HEART_BURST_SIZE = 80;
const HEART_BURST_HALF = HEART_BURST_SIZE / 2;

export default function FactCard({
  fact, isBookmarked, isLiked, onBookmark, onLike, onShare,
  onTopicPress, showTopicHint,
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastTapRef = useRef(0);
  const [bursts, setBursts] = useState([]);

  const triggerHeartBurst = (x, y) => {
    const id = Date.now() + Math.random();
    const scale = new Animated.Value(0);
    const opacity = new Animated.Value(1);
    const burst = { id, x, y, scale, opacity };

    setBursts(prev => [...prev, burst]);

    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.15, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setBursts(prev => prev.filter(b => b.id !== id));
    });
  };

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

  const handleContentPress = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerHeartBurst(locationX, locationY);
      if (!isLiked) {
        handleLike();
      }
    }
    lastTapRef.current = now;
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBookmark(fact.id);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = t('factCard.shareMessage', {
      content: fact.content,
      source: fact.source_name,
    });
    try {
      await Sharing.shareAsync('', { dialogTitle: t('factCard.shareTitle'), message });
    } catch {
      // Sharing not available on all platforms — silently skip
    }
    onShare?.(fact.id);
  };

  const handleSourcePress = () => {
    if (fact.source_url) Linking.openURL(fact.source_url);
  };

  const handleTopicPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTopicPress?.(fact);
  };

  const topicColor = fact.topics?.color ?? colors.ink;

  const topicChip = (
    <View style={styles.topicChip}>
      <Ionicons name={fact.topics?.icon ?? 'flash'} size={14} color={topicColor} />
      <Text style={styles.topicName}>{fact.topics?.name}</Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        {onTopicPress ? (
          <TouchableOpacity onPress={handleTopicPress} activeOpacity={0.7}>
            {topicChip}
          </TouchableOpacity>
        ) : (
          topicChip
        )}
        {showTopicHint && onTopicPress && (
          <Text style={styles.topicHint}>{t('factCard.tapSimilar')}</Text>
        )}
      </View>

      <View style={styles.contentSection}>
        <Pressable style={styles.contentPressable} onPress={handleContentPress}>
          <Text style={styles.quoteSymbol}>"</Text>
          <Text style={styles.factText}>{fact.content}</Text>
        </Pressable>
        {bursts.map(({ id, x, y, scale, opacity }) => (
          <Animated.View
            key={id}
            pointerEvents="none"
            style={[
              styles.heartBurst,
              {
                left: x - HEART_BURST_HALF,
                top: y - HEART_BURST_HALF,
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <Ionicons name="heart" size={HEART_BURST_SIZE} color={colors.error} />
          </Animated.View>
        ))}
      </View>

      {fact.source_name && (
        <TouchableOpacity style={styles.sourceRow} onPress={handleSourcePress} activeOpacity={0.7}>
          <Ionicons name="link-outline" size={13} color={colors.muted} />
          <Text style={styles.sourceText}>{t('factCard.source', { name: fact.source_name })}</Text>
          <Ionicons name="open-outline" size={12} color={colors.muted} />
        </TouchableOpacity>
      )}

      <View style={styles.swipeHint}>
        <Ionicons name="chevron-up" size={16} color={colors.mutedSoft} />
        <Text style={styles.swipeHintText}>{t('factCard.swipeNext')}</Text>
      </View>

      <View style={styles.actions}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.8}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? colors.error : colors.muted}
            />
            <Text style={[styles.actionLabel, isLiked && { color: colors.error }]}>
              {isLiked ? t('factCard.liked') : t('factCard.like')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.actionButton} onPress={handleBookmark} activeOpacity={0.8}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={isBookmarked ? colors.timeline.done : colors.muted}
          />
          <Text style={[styles.actionLabel, isBookmarked && { color: colors.timeline.done }]}>
            {isBookmarked ? t('factCard.saved') : t('factCard.save')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={26} color={colors.muted} />
          <Text style={styles.actionLabel}>{t('factCard.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  card: {
    width,
    height,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.canvas,
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
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceStrong,
    gap: 6,
  },
  topicName: {
    ...typography.presets.captionUppercase,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: typography.fontSizes.sm,
  },
  topicHint: {
    ...typography.presets.caption,
    marginTop: 6,
  },
  contentSection: {
    marginRight: 64,
    marginTop: 40,
    position: 'relative',
  },
  contentPressable: {},
  heartBurst: {
    position: 'absolute',
    zIndex: 10,
  },
  quoteSymbol: {
    fontSize: 72,
    fontFamily: typography.fontFamily.sans,
    color: colors.primary,
    opacity: 0.25,
    lineHeight: 64,
    marginBottom: -8,
  },
  factText: {
    ...typography.presets.displaySm,
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
    ...typography.presets.caption,
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
    opacity: 0.6,
  },
  swipeHintText: {
    ...typography.presets.caption,
    color: colors.mutedSoft,
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
    ...typography.presets.caption,
    color: colors.muted,
  },
  });
}
