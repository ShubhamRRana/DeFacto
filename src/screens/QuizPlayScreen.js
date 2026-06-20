import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useQuiz } from '../hooks/useQuiz';
import QuizProgressBar from '../components/QuizProgressBar';
import QuizQuestionCard from '../components/QuizQuestionCard';

export default function QuizPlayScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { questions, topicName, submitSession, loading, cancelSession } = useQuiz();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const questionStartRef = useRef(Date.now());
  const answerTimingsRef = useRef({});
  const submittingRef = useRef(false);

  const displayTopicName = route.params?.topicName ?? topicName;
  const currentQuestion = questions[currentIndex];
  const total = questions.length;
  const isLast = currentIndex >= total - 1;

  useEffect(() => {
    if (questions.length === 0) {
      navigation.goBack();
    }
  }, [questions, navigation]);

  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentIndex]);

  const handleSelectAnswer = (option) => {
    Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  const recordCurrentQuestionTime = () => {
    answerTimingsRef.current[currentQuestion.id] = Math.max(
      Date.now() - questionStartRef.current,
      500
    );
  };

  const handleNext = async () => {
    if (!answers[currentQuestion.id]) {
      Alert.alert(t('quiz.selectAnswer'), t('quiz.selectAnswerMessage'));
      return;
    }

    recordCurrentQuestionTime();

    if (!isLast) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex((i) => i + 1);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        userAnswer: answers[q.id],
        timeMs: answerTimingsRef.current[q.id] ?? 5000,
      }));

      await submitSession(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('QuizResults', { topicName: displayTopicName });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('quiz.submitFailed'), err.message ?? t('common.tryAgain'));
      submittingRef.current = false;
    }
  };

  const handleCancel = () => {
    Alert.alert(t('quiz.cancelTitle'), t('quiz.cancelMessage'), [
      { text: t('quiz.keepPlaying'), style: 'cancel' },
      {
        text: t('quiz.cancelQuiz'),
        style: 'destructive',
        onPress: async () => {
          await cancelSession();
          navigation.goBack();
        },
      },
    ]);
  };

  if (!currentQuestion) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.muted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayTopicName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <QuizProgressBar current={currentIndex + 1} total={total} />

      <QuizQuestionCard
        question={currentQuestion}
        selectedAnswer={answers[currentQuestion.id]}
        onSelectAnswer={handleSelectAnswer}
        disabled={loading}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.base }]}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLast ? t('quiz.finishQuiz') : t('quiz.nextQuestion')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.canvas,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      ...typography.presets.titleSm,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.sm,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.base,
    },
    nextButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.base,
      alignItems: 'center',
    },
    nextButtonDisabled: {
      opacity: 0.6,
    },
    nextButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
