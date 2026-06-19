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
import { spacing } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';
import { ALL_BADGE_KEYS } from '../utils/quiz';
import { topicCardTint } from '../utils/color';
import SessionConfigSheet from '../components/SessionConfigSheet';
import BadgeGrid from '../components/BadgeGrid';

const QUIZ_CANVAS = '#f1efe6';
const ACTION_COLOR = '#54524a';

export default function QuizHomeScreen({ navigation }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const {
    userTopics,
    badges,
    badgeProgress,
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
  const earnedSet = new Set(earnedBadgeKeys);
  const inProgressCount = ALL_BADGE_KEYS.filter((key) => {
    const p = badgeProgress[key];
    return p && p.current > 0 && !earnedSet.has(key);
  }).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Quizzes</Text>
        <Text style={styles.subtitle}>Test what you know — pick a topic to begin.</Text>

        <Text style={styles.sectionTitle}>Your topics</Text>

        {loading && userTopics.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.topicGrid}>
            {userTopics.map((topic) => {
              const accent = topic.color ?? colors.primary;
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    { backgroundColor: topicCardTint(accent), shadowColor: accent },
                  ]}
                  onPress={() => handleTopicPress(topic)}
                  activeOpacity={0.8}
                >
                  <View style={styles.topicIcon}>
                    <Ionicons name={topic.icon ?? 'help-circle'} size={20} color={accent} />
                  </View>
                  <Text style={styles.topicName} numberOfLines={2}>{topic.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToStack('CreateQuestion')}
          >
            <Ionicons name="create-outline" size={17} color={ACTION_COLOR} />
            <Text style={styles.actionText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToStack('Leaderboard')}
          >
            <Ionicons name="trophy-outline" size={17} color={ACTION_COLOR} />
            <Text style={styles.actionText}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badgesHeader}>
          <Text style={styles.sectionTitleBadges}>Badges</Text>
          <Text style={styles.badgesCount}>
            {inProgressCount} of {ALL_BADGE_KEYS.length} in progress
          </Text>
        </View>
        <BadgeGrid
          earnedKeys={earnedBadgeKeys}
          progress={badgeProgress}
          variant="quiz"
        />
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
      backgroundColor: QUIZ_CANVAS,
    },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: 3,
      paddingBottom: spacing.xxl,
    },
    title: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 38,
      lineHeight: 38,
      letterSpacing: -0.4,
      color: colors.ink,
      marginBottom: 5,
    },
    subtitle: {
      fontFamily: typography.fontFamily.ui,
      fontSize: 15.5,
      color: '#86847b',
      marginBottom: 13,
    },
    sectionTitle: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 19,
      color: colors.ink,
      marginBottom: 9,
    },
    sectionTitleBadges: {
      fontFamily: typography.fontFamily.serifDisplayMedium,
      fontSize: 19,
      color: colors.ink,
    },
    topicGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 11,
      marginBottom: 9,
    },
    topicCard: {
      width: '47%',
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 9,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    topicIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topicName: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 14.5,
      color: colors.ink,
      textAlign: 'center',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 11,
      marginBottom: 16,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      height: 46,
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      shadowColor: '#28261f',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    actionText: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 13.5,
      color: ACTION_COLOR,
    },
    badgesHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 9,
    },
    badgesCount: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 12.5,
      color: '#a09e94',
    },
    loader: {
      marginVertical: spacing.xl,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: QUIZ_CANVAS + 'EE',
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
