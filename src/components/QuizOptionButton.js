import React, { useMemo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function QuizOptionButton({ label, letter, selected, onPress, disabled }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={[styles.marker, selected && styles.markerSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
        ) : (
          <Text style={styles.markerText}>{letter}</Text>
        )}
      </View>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    optionSelected: {
      borderColor: colors.primary,
      borderWidth: 1.5,
      backgroundColor: `${colors.primary}0d`,
    },
    marker: {
      width: 26,
      height: 26,
      borderRadius: borderRadius.pill,
      borderWidth: 1.5,
      borderColor: colors.hairlineStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.canvasSoft,
    },
    markerSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    markerText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
    },
    optionText: {
      flex: 1,
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
