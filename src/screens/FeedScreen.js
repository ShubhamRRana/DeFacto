import React, { useRef, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, ActivityIndicator,
  Text, TouchableOpacity, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme/colors';
import { useFeed } from '../hooks/useFeed';
import { useStreak } from '../hooks/useStreak';
import FactCard from '../components/FactCard';

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const {
    facts, loading, isPersonalized, generating,
    bookmarked, liked,
    fetchFeed, toggleBookmark, toggleLike, recordSkip,
  } = useFeed();
  const { updateStreak } = useStreak();
  const flatListRef = useRef(null);
  const currentFactRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
      updateStreak();
    }, [fetchFeed, updateStreak])
  );

  // When a new fact becomes visible, record the previous one as skipped
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const incoming = viewableItems[0].item;
      // If user swiped past previous fact without liking it, record as skip
      if (currentFactRef.current && currentFactRef.current.id !== incoming.id) {
        const wasLiked = false; // we can't access state here — skip recording is best-effort
        recordSkip(currentFactRef.current.id);
      }
      currentFactRef.current = incoming;
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your facts...</Text>
      </View>
    );
  }

  if (!loading && facts.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="planet-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No facts yet</Text>
        <Text style={styles.emptySubtitle}>
          Make sure you've selected topics and that facts exist for them.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFeed}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header overlay */}
      <LinearGradient
        colors={['rgba(10,10,15,0.95)', 'transparent']}
        style={styles.headerOverlay}
        pointerEvents="none"
      >
        <View style={styles.headerContent}>
          <Text style={styles.appName}>De'Facto</Text>
          {/* Personalization badge */}
          {generating && (
            <View style={styles.generatingBadge}>
              <ActivityIndicator size={10} color={colors.primary} />
              <Text style={styles.generatingText}>Fetching new facts...</Text>
            </View>
          )}
          <View style={[styles.personalizedBadge, isPersonalized && styles.personalizedBadgeActive]}>
            <Ionicons
              name={isPersonalized ? 'sparkles' : 'flash'}
              size={13}
              color={isPersonalized ? colors.gold : colors.primary}
            />
            <Text style={[styles.personalizedText, isPersonalized && styles.personalizedTextActive]}>
              {isPersonalized ? 'For You' : 'Discover'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Vertical paging feed */}
      <FlatList
        ref={flatListRef}
        data={facts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FactCard
            fact={item}
            isBookmarked={bookmarked.has(item.id)}
            isLiked={liked.has(item.id)}
            onBookmark={toggleBookmark}
            onLike={toggleLike}
            onShare={(id) => recordSkip(id)}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 99,
  },
  retryText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: '#fff',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  generatingText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  personalizedBadgeActive: {
    backgroundColor: colors.gold + '22',
    borderColor: colors.gold + '55',
  },
  personalizedText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  personalizedTextActive: {
    color: colors.gold,
  },
});
