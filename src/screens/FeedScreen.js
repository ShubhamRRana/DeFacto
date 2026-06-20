import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  View, FlatList, StyleSheet, ActivityIndicator,
  Text, TouchableOpacity, Dimensions, Alert, RefreshControl,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useFeed } from '../hooks/useFeed';
import { useStreak } from '../hooks/useStreak';
import FactCard from '../components/FactCard';

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const {
    facts, loading, refreshing, refreshError, isPersonalized, generating,
    bookmarked, liked,
    fetchFeed, refreshFeed, loadMoreFeed, fetchTopicFacts,
    fetchTopicFactsWithGeneration,
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
      Alert.alert(t('feed.refreshFailed'), result.error);
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
      Alert.alert(t('feed.refreshFailed'), result.error);
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
    const topicFacts = await fetchTopicFactsWithGeneration(fact.topic_id);
    setEnteringRabbitHole(false);

    if (topicFacts.length < 2) {
      Alert.alert(t('feed.noMoreFacts'), t('feed.noMoreFactsMessage'));
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
  }, [facts, fetchTopicFactsWithGeneration]);

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
        <LoadingSpinner color={colors.primary} />
        <Text style={styles.loadingText}>{t('feed.loading')}</Text>
      </View>
    );
  }

  if (!loading && facts.length === 0 && !isRabbitHole) {
    return (
      <View style={styles.centered}>
        <Ionicons name="planet-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>{t('feed.emptyTitle')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('feed.emptySubtitle')}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryText}>{t('feed.tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerInteractive}>
        {isRabbitHole ? (
          <View style={styles.rabbitHoleHeader}>
            <TouchableOpacity style={styles.backButton} onPress={exitRabbitHole} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.rabbitHoleTitle, { color: rabbitHoleTopic?.color ?? colors.ink }]}>
              {t('feed.moreIn', { topic: rabbitHoleTopic?.name })}
            </Text>
            {(generating || refreshing) && (
              <View style={styles.generatingBadge}>
                <ActivityIndicator size={10} color={colors.primary} />
                <Text style={styles.generatingText}>
                  {refreshing ? t('feed.findingMore') : t('feed.fetchingNew')}
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
                    ? t('feed.findingMore')
                    : t('feed.fetchingNew')}
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
                {isPersonalized ? t('feed.forYou') : t('feed.discover')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {enteringRabbitHole && (
        <View style={styles.enteringOverlay}>
          <LoadingSpinner color={colors.primary} />
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

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.presets.bodyMd,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.presets.displaySm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.presets.bodyMd,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    ...typography.presets.button,
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
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
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
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
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  rabbitHoleTitle: {
    ...typography.presets.titleMd,
    flex: 1,
  },
  appName: {
    ...typography.presets.titleMd,
    letterSpacing: -0.2,
  },
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  generatingText: {
    ...typography.presets.caption,
    flexShrink: 1,
  },
  refreshErrorBanner: {
    position: 'absolute',
    top: 100,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 12,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  refreshErrorText: {
    ...typography.presets.caption,
    color: colors.error,
    textAlign: 'center',
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  personalizedBadgeActive: {
    backgroundColor: colors.timeline.done + '22',
    borderColor: colors.timeline.done + '55',
  },
  personalizedText: {
    ...typography.presets.caption,
    fontFamily: typography.fontFamily.sansSemiBold,
    color: colors.primary,
  },
  personalizedTextActive: {
    color: colors.timeline.done,
  },
  enteringOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvas + 'D9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  });
}
