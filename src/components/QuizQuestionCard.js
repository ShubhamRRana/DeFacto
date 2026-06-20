import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QuizOptionButton from './QuizOptionButton';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function QuizQuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled,
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const options = Array.isArray(question.options) ? question.options : [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <View style={styles.card}>
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>
          {question.question_type === 'true_false' ? 'True / False' : 'Multiple Choice'}
        </Text>
      </View>
      <Text style={styles.questionText}>{question.question_text}</Text>
      <View style={styles.options}>
        {options.map((option, index) => (
          <QuizOptionButton
            key={option}
            label={option}
            letter={letters[index] ?? index + 1}
            selected={selectedAnswer === option}
            onPress={() => onSelectAnswer(option)}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.lg,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: `${colors.primary}14`,
      borderRadius: borderRadius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      marginBottom: spacing.md,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.88,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    questionText: {
      ...typography.presets.displaySm,
      marginBottom: spacing.lg,
    },
    options: {
      flex: 1,
    },
  });
}
