import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';

export default function QuizResultsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { results, resetSession } = useQuiz();

  const topicName = route.params?.topicName ?? t('quiz.defaultTopic');
  const scoreCorrect = results?.score_correct ?? 0;
  const questionCount = results?.question_count ?? 0;
  const compositeScore = results?.composite_score ?? 0;
  const wrongAnswers = Array.isArray(results?.wrong_answers)
    ? results.wrong_answers
    : [];
  const accuracy = questionCount > 0
    ? Math.round((scoreCorrect / questionCount) * 100)
    : 0;
  const tierColor = accuracy >= 80
    ? colors.success
    : accuracy >= 50
      ? colors.timeline.done
      : colors.error;

  const handleDone = () => {
    resetSession();
    navigation.popToTop();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('quiz.results.title')}</Text>
        <Text style={styles.topic}>{topicName}</Text>

        <View style={styles.scoreCard}>
          <View style={[styles.scoreBadge, { borderColor: tierColor }]}>
            <Text style={[styles.scoreMain, { color: tierColor }]}>{scoreCorrect}/{questionCount}</Text>
          </View>
          <Text style={styles.scoreSub}>{t('quiz.results.percentCorrect', { percent: accuracy })}</Text>
          <View style={styles.compositePill}>
            <Ionicons name="star" size={16} color={colors.timeline.done} />
            <Text style={styles.compositeText}>{t('quiz.results.compositePoints', { score: compositeScore })}</Text>
          </View>
        </View>

        {wrongAnswers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.sectionTitle}>{t('quiz.results.reviewMissed')}</Text>
              <View style={styles.missedCountBadge}>
                <Text style={styles.missedCountText}>{wrongAnswers.length}</Text>
              </View>
            </View>
            {wrongAnswers.map((item, index) => (
              <View key={item.question_id ?? index} style={styles.wrongCard}>
                <View style={styles.wrongCardHeader}>
                  <Text style={styles.wrongCardIndex}>{index + 1}</Text>
                  <Text style={styles.wrongQuestion}>{item.question_text}</Text>
                </View>
                <View style={styles.wrongCardDivider} />
                <View style={styles.answerBlock}>
                  <View style={styles.answerLabelRow}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                    <Text style={styles.answerLabel}>{t('quiz.results.yourAnswer')}</Text>
                  </View>
                  <Text style={[styles.answerValue, styles.wrongUser]}>{item.user_answer}</Text>
                </View>
                <View style={styles.answerBlock}>
                  <View style={styles.answerLabelRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.answerLabel}>{t('quiz.results.correct')}</Text>
                  </View>
                  <Text style={[styles.answerValue, styles.correctText]}>{item.correct_answer}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {wrongAnswers.length === 0 && (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectEmoji}>🎉</Text>
            <Text style={styles.perfectText}>{t('quiz.results.perfect')}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{t('quiz.results.backToQuizzes')}</Text>
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
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    scoreBadge: {
      width: 116,
      height: 116,
      borderRadius: borderRadius.pill,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    scoreMain: {
      fontSize: 34,
      fontWeight: '700',
    },
    scoreSub: {
      fontSize: 16,
      color: colors.muted,
      marginTop: spacing.xxs,
    },
    compositePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.base,
      backgroundColor: `${colors.timeline.done}1a`,
      borderRadius: borderRadius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    compositeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.timeline.done,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.presets.titleSm,
      flex: 1,
    },
    missedCountBadge: {
      backgroundColor: `${colors.error}1a`,
      borderRadius: borderRadius.pill,
      minWidth: 24,
      height: 24,
      paddingHorizontal: spacing.xxs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    missedCountText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.error,
    },
    wrongCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.base,
      marginBottom: spacing.sm,
    },
    wrongCardHeader: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    wrongCardIndex: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.muted,
    },
    wrongQuestion: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
    },
    wrongCardDivider: {
      height: 1,
      backgroundColor: colors.hairline,
      marginVertical: spacing.sm,
    },
    answerBlock: {
      marginBottom: spacing.xs,
    },
    answerLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginBottom: 2,
    },
    answerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    answerValue: {
      fontSize: 14,
      marginLeft: 22,
    },
    wrongUser: {
      color: colors.error,
      fontWeight: '600',
    },
    correctText: {
      color: colors.success,
      fontWeight: '600',
    },
    perfectCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
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
  });
}
