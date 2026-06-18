import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';
import SessionConfigSheet from '../components/SessionConfigSheet';
import BadgeGrid from '../components/BadgeGrid';

export default function QuizHomeScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const {
    userTopics,
    quizProfile,
    badges,
    userRank,
    loading,
    loadingStep,
    fetchQuizProfile,
    startSession,
  } = useQuiz();

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchQuizProfile();
    }, [fetchQuizProfile])
  );

  const navigateToStack = (screen, params) => {
    const parent = navigation.getParent();
    if (parent) parent.navigate(screen, params);
    else navigation.navigate(screen, params);
  };

  const handleTopicPress = (topic) => {
    Haptics.selectionAsync();
    setSelectedTopic(topic);
    setShowConfig(true);
  };

  const handleStartQuiz = async (config) => {
    setStarting(true);
    setShowConfig(false);
    try {
      await startSession(config);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateToStack('QuizPlay', { topicName: selectedTopic?.name });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not start quiz', err.message ?? 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const earnedBadgeKeys = badges.map((b) => b.badge_key);
  const quizStreak = quizProfile?.quiz_streak_count ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Quizzes</Text>
        <Text style={styles.subtitle}>Test what you know — pick a topic to begin</Text>

        <View style={styles.streakCard}>
          <View>
            <Text style={styles.streakLabel}>Quiz Streak</Text>
            <Text style={styles.streakValue}>{quizStreak} day{quizStreak !== 1 ? 's' : ''}</Text>
          </View>
          {userRank?.rank && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankLabel}>Weekly Rank</Text>
              <Text style={styles.rankValue}>#{userRank.rank}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Topics</Text>
        </View>

        {loading && userTopics.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.topicGrid}>
            {userTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                onPress={() => handleTopicPress(topic)}
                activeOpacity={0.8}
              >
                <View style={[styles.topicIcon, { backgroundColor: topic.color + '22' }]}>
                  <Ionicons name={topic.icon ?? 'help-circle'} size={22} color={topic.color ?? colors.primary} />
                </View>
                <Text style={styles.topicName} numberOfLines={2}>{topic.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToStack('CreateQuestion')}
          >
            <Ionicons name="create-outline" size={20} color={colors.ink} />
            <Text style={styles.actionText}>Create Question</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToStack('Leaderboard')}
          >
            <Ionicons name="trophy-outline" size={20} color={colors.ink} />
            <Text style={styles.actionText}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Badges</Text>
        <BadgeGrid earnedKeys={earnedBadgeKeys} />
      </ScrollView>

      {starting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{loadingStep || 'Preparing quiz…'}</Text>
          <Text style={styles.loadingHint}>This may take a few seconds</Text>
        </View>
      )}

      <SessionConfigSheet
        visible={showConfig}
        topic={selectedTopic}
        onClose={() => setShowConfig(false)}
        onStart={handleStartQuiz}
        starting={starting}
      />
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    title: {
      ...typography.presets.displayMd,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 15,
      color: colors.muted,
      marginBottom: spacing.lg,
    },
    streakCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    streakLabel: {
      fontSize: 13,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    streakValue: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.ink,
      marginTop: 4,
    },
    rankBadge: {
      alignItems: 'flex-end',
    },
    rankLabel: {
      fontSize: 13,
      color: colors.muted,
    },
    rankValue: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.primary,
    },
    sectionHeader: {
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.presets.titleSm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    topicGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    topicCard: {
      width: '47%',
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.base,
      alignItems: 'center',
    },
    topicIcon: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    topicName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
      textAlign: 'center',
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingVertical: spacing.base,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.ink,
    },
    loader: {
      marginVertical: spacing.xl,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.canvas + 'EE',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    loadingText: {
      marginTop: spacing.base,
      fontSize: 16,
      color: colors.ink,
      fontWeight: '600',
    },
    loadingHint: {
      marginTop: spacing.xs,
      fontSize: 13,
      color: colors.muted,
    },
  });
}
