import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor((durationMs ?? 0) / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const DIFFICULTY_MULTIPLIER = { easy: 1.0, medium: 1.5, hard: 2.0 };

function getSpeedBucket(avgSeconds) {
  if (avgSeconds < 5) return { key: 'speedFast', multiplier: 1.2 };
  if (avgSeconds < 10) return { key: 'speedNormal', multiplier: 1.0 };
  return { key: 'speedSlow', multiplier: 0.8 };
}

// Matches public.compute_composite_score length_bonus in Supabase.
function getLengthBonus(questionCount) {
  if (questionCount <= 0) return 1.0;
  return 0.8 + (questionCount - 5) * (0.5 / 25.0);
}

function computeRawScore(correct, difficultyMult, speedMult, lengthMult) {
  return Math.max(0, correct * difficultyMult * speedMult * lengthMult);
}

function formatDecimal(value, maxDecimals = 4) {
  const factor = 10 ** maxDecimals;
  const n = Math.round(value * factor) / factor;
  return n.toFixed(maxDecimals).replace(/\.?0+$/, '');
}

export default function QuizResultsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { results, resetSession } = useQuiz();
  const [showInfo, setShowInfo] = useState(false);

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const topicName = route.params?.topicName ?? t('quiz.defaultTopic');
  const scoreCorrect = results?.score_correct ?? 0;
  const questionCount = results?.question_count ?? 0;
  const durationMs = results?.duration_ms ?? 0;
  const wrongAnswers = Array.isArray(results?.wrong_answers)
    ? results.wrong_answers
    : [];
  const accuracy = questionCount > 0
    ? Math.round((scoreCorrect / questionCount) * 100)
    : 0;

  const difficultyKey = route.params?.difficulty ?? 'medium';
  const difficultyMultiplier = DIFFICULTY_MULTIPLIER[difficultyKey] ?? 1.0;
  const avgSeconds = questionCount > 0
    ? (durationMs / questionCount) / 1000
    : 0;
  const speedBucket = getSpeedBucket(avgSeconds);
  const lengthBonus = getLengthBonus(questionCount);
  const displayPoints = formatDecimal(computeRawScore(
    scoreCorrect,
    difficultyMultiplier,
    speedBucket.multiplier,
    lengthBonus,
  ));

  const handleNext = useCallback(() => {
    resetSession();
    // QuizPlay replaces itself with QuizResults, so popToTop is unreliable here.
    // Prefer a single pop back to Main; fall back to explicit nested navigation.
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Main', { screen: 'Quizzes' });
  }, [resetSession, navigation]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('quiz.results.eyebrow')}</Text>
        <Text style={styles.title}>{topicName}</Text>
        <Text style={styles.meta}>
          {t('quiz.results.metaLine', {
            difficulty: t(`quiz.difficulty.${difficultyKey}`),
            count: questionCount,
            duration: formatDuration(durationMs),
          })}
        </Text>

        <View style={styles.accuracyCard}>
          <View style={styles.accuracyGroup}>
            <Text style={styles.accuracyValue}>{scoreCorrect} / {questionCount}</Text>
            <Text style={styles.accuracyCaption}>{t('quiz.results.correctLabel')}</Text>
          </View>
          <View style={[styles.accuracyGroup, styles.accuracyGroupRight]}>
            <Text style={styles.accuracyCaptionLeft}>{t('quiz.results.accuracyLabel')}</Text>
            <Text style={styles.accuracyValue}>
              {accuracy}
              <Text style={styles.accuracyPercentSign}>%</Text>
            </Text>
          </View>
        </View>

        <View style={styles.pointsCard}>
          <View style={styles.pointsLabelRow}>
            <View style={styles.pointsDot} />
            <Text style={styles.pointsLabel}>{t('quiz.results.pointsEarned')}</Text>
            <TouchableOpacity
              onPress={() => setShowInfo(true)}
              style={styles.infoButton}
              activeOpacity={0.7}
            >
              <Text style={styles.infoButtonText}>i</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pointsValue}>
            {displayPoints}
            <Text style={styles.pointsSuffix}> pts</Text>
          </Text>
        </View>

        {wrongAnswers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('quiz.results.reviewMissed')}</Text>
              <Text style={styles.missedCountText}>
                {t('quiz.results.missedCount', { count: wrongAnswers.length })}
              </Text>
            </View>
            {wrongAnswers.map((item, index) => (
              <View key={item.question_id ?? index} style={styles.reviewCard}>
                <Text style={styles.reviewQuestion}>{item.question_text}</Text>
                <View style={styles.answerRows}>
                  <View style={styles.answerRowWrong}>
                    <Ionicons name="close" size={13} color={colors.error} />
                    <Text style={styles.answerRowValueWrong}>{item.user_answer}</Text>
                  </View>
                  <View style={styles.answerRowCorrect}>
                    <Ionicons name="checkmark" size={13} color={colors.success} />
                    <Text style={styles.answerRowValueCorrect}>{item.correct_answer}</Text>
                  </View>
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

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backButtonText}>{t('quiz.results.backToQuizzes')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable style={styles.infoOverlay} onPress={() => setShowInfo(false)}>
          <Pressable style={styles.infoPopover} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.infoPopoverTitle}>{t('quiz.results.pointsBreakdownTitle')}</Text>
            <View style={styles.infoRows}>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>{t('quiz.results.correctAnswers')}</Text>
                <Text style={styles.infoRowValue}>{scoreCorrect}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>
                  {t('quiz.results.difficultyMultiplier', { difficulty: t(`quiz.difficulty.${difficultyKey}`) })}
                </Text>
                <Text style={styles.infoRowValue}>×{formatDecimal(difficultyMultiplier)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>
                  {t('quiz.results.speedMultiplier', { speed: t(`quiz.results.${speedBucket.key}`) })}
                </Text>
                <Text style={styles.infoRowValue}>×{formatDecimal(speedBucket.multiplier)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>
                  {t('quiz.results.lengthMultiplier', { count: questionCount })}
                </Text>
                <Text style={styles.infoRowValue}>×{formatDecimal(lengthBonus)}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoTotalLabel}>{t('quiz.results.total')}</Text>
              <Text style={styles.infoTotalValue}>
                {t('quiz.results.pointsShort', { score: displayPoints })}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    eyebrow: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    title: {
      fontFamily: typography.fontFamily.serifDisplay,
      fontSize: 30,
      color: colors.ink,
      lineHeight: 34,
      letterSpacing: -0.2,
      marginTop: spacing.xxs,
      marginBottom: spacing.xxs,
    },
    meta: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 13,
      fontWeight: '500',
      color: colors.muted,
      marginBottom: spacing.lg,
    },
    accuracyCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.xl + 2,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    accuracyGroup: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    accuracyGroupRight: {
      flexDirection: 'row',
    },
    accuracyValue: {
      fontFamily: typography.fontFamily.serifDisplay,
      fontSize: 28,
      color: colors.ink,
      lineHeight: 30,
    },
    accuracyPercentSign: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 16,
      color: colors.muted,
    },
    accuracyCaption: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 12,
      fontWeight: '500',
      color: colors.muted,
      textTransform: 'capitalize',
    },
    accuracyCaptionLeft: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    pointsCard: {
      position: 'relative',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.xl + 2,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pointsLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 1,
    },
    pointsDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    pointsLabel: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    infoButton: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.mutedSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoButtonText: {
      fontFamily: typography.fontFamily.serifDisplay,
      fontStyle: 'italic',
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
    },
    pointsValue: {
      fontFamily: typography.fontFamily.serifDisplay,
      fontSize: 28,
      color: colors.ink,
      lineHeight: 30,
    },
    pointsSuffix: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 13,
      fontWeight: '500',
      color: colors.muted,
    },
    infoOverlay: {
      flex: 1,
      backgroundColor: colors.ink + '66',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    infoPopover: {
      width: 252,
      alignSelf: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
      borderRadius: borderRadius.lg,
      padding: spacing.sm + 3,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    infoPopoverTitle: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.muted,
      marginBottom: spacing.xs + 3,
    },
    infoRows: {
      gap: spacing.xs,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    infoRowLabel: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 13,
      fontWeight: '500',
      color: colors.body,
    },
    infoRowValue: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.ink,
    },
    infoDivider: {
      height: 1,
      backgroundColor: colors.hairline,
      marginVertical: spacing.sm,
    },
    infoTotalLabel: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    infoTotalValue: {
      fontFamily: typography.fontFamily.uiBold,
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    section: {
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontFamily: typography.fontFamily.serifDisplay,
      fontSize: 21,
      color: colors.ink,
    },
    missedCountText: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.error,
    },
    reviewCard: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.xl - 2,
      padding: spacing.sm + 3,
      marginBottom: spacing.xs + 3,
    },
    reviewQuestion: {
      fontFamily: typography.fontFamily.sans,
      fontSize: 15,
      fontWeight: '400',
      color: colors.ink,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    answerRows: {
      gap: spacing.xs,
    },
    answerRowWrong: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: `${colors.error}1a`,
      borderRadius: borderRadius.md + 2,
      paddingVertical: spacing.xs + 1,
      paddingHorizontal: spacing.sm - 1,
    },
    answerRowCorrect: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: `${colors.success}1a`,
      borderRadius: borderRadius.md + 2,
      paddingVertical: spacing.xs + 1,
      paddingHorizontal: spacing.sm - 1,
    },
    answerRowValueWrong: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.error,
    },
    answerRowValueCorrect: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.success,
    },
    perfectCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    perfectEmoji: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    perfectText: {
      fontFamily: typography.fontFamily.uiMedium,
      fontSize: 16,
      color: colors.ink,
      textAlign: 'center',
    },
    footerRow: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl - 3,
      paddingVertical: spacing.md,
      minHeight: 52,
    },
    backButtonText: {
      fontFamily: typography.fontFamily.uiBold,
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
