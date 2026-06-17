import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, ActivityIndicator,
  Text, TouchableOpacity, Dimensions, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '../theme/colors';
import { useFeed } from '../hooks/useFeed';
import { useStreak } from '../hooks/useStreak';
import FactCard from '../components/FactCard';

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const {
    facts, loading, refreshing, refreshError, isPersonalized, generating,
    bookmarked, liked,
    fetchFeed, refreshFeed, loadMoreFeed, fetchTopicFacts,
    refreshTopicFeed, loadMoreTopicFeed,
    toggleBookmark, toggleLike, recordSkip,
  } = useFeed();
  const { updateStreak } = useStreak();
  const flatListRef = useRef(null);
  const currentFactRef = useRef(null);
  const currentIndexRef = useRef(0);
  const isRabbitHoleRef = useRef(false);
  const endLoadTriggeredRef = useRef(false);
  const rabbitHoleTopicRef = useRef(null);
  const rabbitHoleFactsRef = useRef([]);

  const [isRabbitHole, setIsRabbitHole] = useState(false);
  const [rabbitHoleFacts, setRabbitHoleFacts] = useState([]);
  const [mainFeedIndex, setMainFeedIndex] = useState(0);
  const [rabbitHoleTopic, setRabbitHoleTopic] = useState(null);
  const [enteringRabbitHole, setEnteringRabbitHole] = useState(false);

  useEffect(() => {
    isRabbitHoleRef.current = isRabbitHole;
  }, [isRabbitHole]);

  useEffect(() => {
    rabbitHoleTopicRef.current = rabbitHoleTopic;
  }, [rabbitHoleTopic]);

  useEffect(() => {
    rabbitHoleFactsRef.current = rabbitHoleFacts;
  }, [rabbitHoleFacts]);

  useEffect(() => {
    endLoadTriggeredRef.current = false;
  }, [facts.length, rabbitHoleFacts.length]);

  useFocusEffect(
    useCallback(() => {
      if (!isRabbitHoleRef.current) {
        fetchFeed();
      }
      updateStreak();
    }, [fetchFeed, updateStreak])
  );

  const handleRefresh = useCallback(async () => {
    const result = await refreshFeed();
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (result?.error) {
      Alert.alert('Refresh failed', result.error);
    }
  }, [refreshFeed]);

  const handleRabbitHoleRefresh = useCallback(async () => {
    const topicId = rabbitHoleTopicRef.current?.id;
    if (!topicId) return;

    const result = await refreshTopicFeed(topicId);
    if (result.success && result.facts) {
      setRabbitHoleFacts(result.facts);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
    if (result?.error) {
      Alert.alert('Refresh failed', result.error);
    }
  }, [refreshTopicFeed]);

  const handleListRefresh = useCallback(() => {
    if (isRabbitHoleRef.current) {
      handleRabbitHoleRefresh();
    } else {
      handleRefresh();
    }
  }, [handleRabbitHoleRefresh, handleRefresh]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const incoming = viewableItems[0].item;
      const index = viewableItems[0].index;

      if (index != null) {
        currentIndexRef.current = index;
      }
      if (currentFactRef.current && currentFactRef.current.id !== incoming.id) {
        recordSkip(currentFactRef.current.id);
      }
      currentFactRef.current = incoming;

      const inRabbitHole = isRabbitHoleRef.current;
      const listLength = inRabbitHole
        ? rabbitHoleFactsRef.current.length
        : facts.length;
      const isLast = index != null && index === listLength - 1;

      if (
        isLast &&
        !refreshing &&
        !generating &&
        !endLoadTriggeredRef.current
      ) {
        endLoadTriggeredRef.current = true;

        if (inRabbitHole) {
          const topicId = rabbitHoleTopicRef.current?.id;
          if (topicId) {
            loadMoreTopicFeed(topicId, rabbitHoleFactsRef.current).then((result) => {
              if (result.success && result.newFacts?.length > 0) {
                setRabbitHoleFacts(prev => [...prev, ...result.newFacts]);
              }
            });
          }
        } else {
          loadMoreFeed();
        }
      }
    }
  }, [facts.length, refreshing, generating, loadMoreFeed, loadMoreTopicFeed, recordSkip]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const handleTopicPress = useCallback(async (fact) => {
    const snapshotIndex = facts.findIndex((f) => f.id === fact.id);
    const index = snapshotIndex >= 0 ? snapshotIndex : currentIndexRef.current;

    setEnteringRabbitHole(true);
    const topicFacts = await fetchTopicFacts(fact.topic_id);
    setEnteringRabbitHole(false);

    if (topicFacts.length < 2) {
      Alert.alert('No more facts', 'No more facts in this topic yet.');
      return;
    }

    const originIndex = topicFacts.findIndex((f) => f.id === fact.id);
    let orderedFacts = topicFacts;
    if (originIndex > 0) {
      orderedFacts = [
        topicFacts[originIndex],
        ...topicFacts.slice(0, originIndex),
        ...topicFacts.slice(originIndex + 1),
      ];
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMainFeedIndex(index);
    setRabbitHoleTopic({ id: fact.topic_id, name: fact.topics?.name, color: fact.topics?.color });
    setRabbitHoleFacts(orderedFacts);
    setIsRabbitHole(true);

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [facts, fetchTopicFacts]);

  const exitRabbitHole = useCallback(() => {
    const index = mainFeedIndex;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRabbitHole(false);
    setRabbitHoleFacts([]);
    setRabbitHoleTopic(null);

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    });
  }, [mainFeedIndex]);

  const displayFacts = isRabbitHole ? rabbitHoleFacts : facts;

  if (loading && !isRabbitHole) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your facts...</Text>
      </View>
    );
  }

  if (!loading && facts.length === 0 && !isRabbitHole) {
    return (
      <View style={styles.centered}>
        <Ionicons name="planet-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No facts yet</Text>
        <Text style={styles.emptySubtitle}>
          Make sure you've selected topics and that facts exist for them.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header gradient (decorative) */}
      <LinearGradient
        colors={['rgba(10,10,15,0.95)', 'transparent']}
        style={styles.headerOverlay}
        pointerEvents="none"
      />

      {/* Interactive header */}
      <View style={styles.headerInteractive}>
        {isRabbitHole ? (
          <View style={styles.rabbitHoleHeader}>
            <TouchableOpacity style={styles.backButton} onPress={exitRabbitHole} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.rabbitHoleTitle, { color: rabbitHoleTopic?.color ?? colors.textPrimary }]}>
              More in {rabbitHoleTopic?.name}
            </Text>
            {(generating || refreshing) && (
              <View style={styles.generatingBadge}>
                <ActivityIndicator size={10} color={colors.primary} />
                <Text style={styles.generatingText}>
                  {refreshing ? 'Finding more facts...' : 'Fetching new facts...'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.headerContent}>
            <Text style={styles.appName}>De'Facto</Text>
            {(generating || refreshing) && (
              <View style={styles.generatingBadge}>
                <ActivityIndicator size={10} color={colors.primary} />
                <Text style={styles.generatingText}>
                  {refreshing
                    ? "Finding more facts..."
                    : 'Fetching new facts...'}
                </Text>
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
        )}
      </View>

      {enteringRabbitHole && (
        <View style={styles.enteringOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {refreshError && !generating && !refreshing && (
        <View style={styles.refreshErrorBanner}>
          <Text style={styles.refreshErrorText}>{refreshError}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={displayFacts}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleListRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressViewOffset={100}
          />
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FactCard
            fact={item}
            isBookmarked={bookmarked.has(item.id)}
            isLiked={liked.has(item.id)}
            onBookmark={toggleBookmark}
            onLike={toggleLike}
            onShare={(id) => recordSkip(id)}
            onTopicPress={!isRabbitHole ? handleTopicPress : undefined}
            showTopicHint={!isRabbitHole}
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
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
        }}
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
  },
  headerInteractive: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 11,
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rabbitHoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rabbitHoleTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    flex: 1,
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
    flexShrink: 1,
  },
  refreshErrorBanner: {
    position: 'absolute',
    top: 100,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 12,
    backgroundColor: 'rgba(255,80,80,0.15)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.3)',
  },
  refreshErrorText: {
    fontSize: typography.fontSizes.xs,
    color: '#ff8080',
    textAlign: 'center',
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
  enteringOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});
