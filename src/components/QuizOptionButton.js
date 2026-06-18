import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function QuizOptionButton({ label, selected, onPress, disabled }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    option: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.canvasSoft,
    },
    optionText: {
      fontSize: 16,
      color: colors.ink,
      lineHeight: 22,
    },
    optionTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
