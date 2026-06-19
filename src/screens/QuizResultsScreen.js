import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';

export default function QuizResultsScreen({ navigation, route }) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { results, resetSession } = useQuiz();

  const topicName = route.params?.topicName ?? 'Quiz';
  const scoreCorrect = results?.score_correct ?? 0;
  const questionCount = results?.question_count ?? 0;
  const compositeScore = results?.composite_score ?? 0;
  const wrongAnswers = Array.isArray(results?.wrong_answers)
    ? results.wrong_answers
    : [];
  const accuracy = questionCount > 0
    ? Math.round((scoreCorrect / questionCount) * 100)
    : 0;

  const handleDone = () => {
    resetSession();
    navigation.popToTop();
  };

  const handlePlayAgain = () => {
    resetSession();
    navigation.popToTop();
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Quiz Complete!</Text>
        <Text style={styles.topic}>{topicName}</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreMain}>{scoreCorrect}/{questionCount}</Text>
          <Text style={styles.scoreSub}>{accuracy}% correct</Text>
          <View style={styles.compositeRow}>
            <Ionicons name="star" size={18} color={colors.timeline.done} />
            <Text style={styles.compositeText}>{compositeScore} composite points</Text>
          </View>
        </View>

        {wrongAnswers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review Missed Questions</Text>
            {wrongAnswers.map((item, index) => (
              <View key={item.question_id ?? index} style={styles.wrongCard}>
                <Text style={styles.wrongQuestion}>{item.question_text}</Text>
                <Text style={styles.wrongAnswer}>
                  Your answer: <Text style={styles.wrongUser}>{item.user_answer}</Text>
                </Text>
                <Text style={styles.correctAnswer}>
                  Correct: <Text style={styles.correctText}>{item.correct_answer}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {wrongAnswers.length === 0 && (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectEmoji}>🎉</Text>
            <Text style={styles.perfectText}>Perfect score! Outstanding work.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAgain}>
          <Text style={styles.primaryButtonText}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleDone}>
          <Text style={styles.secondaryButtonText}>Back to Quizzes</Text>
        </TouchableOpacity>
      </ScrollView>
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
      textAlign: 'center',
    },
    topic: {
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    scoreCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    scoreMain: {
      fontSize: 48,
      fontWeight: '600',
      color: colors.ink,
    },
    scoreSub: {
      fontSize: 16,
      color: colors.muted,
      marginTop: spacing.xs,
    },
    compositeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.base,
    },
    compositeText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.timeline.done,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.presets.titleSm,
      marginBottom: spacing.sm,
    },
    wrongCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.base,
      marginBottom: spacing.sm,
    },
    wrongQuestion: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
      marginBottom: spacing.sm,
    },
    wrongAnswer: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 4,
    },
    wrongUser: {
      color: colors.error,
    },
    correctAnswer: {
      fontSize: 14,
      color: colors.muted,
    },
    correctText: {
      color: colors.success,
      fontWeight: '600',
    },
    perfectCard: {
      alignItems: 'center',
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    perfectEmoji: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    perfectText: {
      fontSize: 16,
      color: colors.ink,
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.base,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      paddingVertical: spacing.base,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.muted,
      fontSize: 15,
    },
  });
}
