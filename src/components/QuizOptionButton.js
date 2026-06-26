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
      activeOpacity={0.85}
    >
      <View style={[styles.marker, selected && styles.markerSelected]}>
        <Text style={[styles.markerText, selected && styles.markerTextSelected]}>{letter}</Text>
      </View>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark" size={18} color={colors.primary} style={styles.check} />
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1.5,
      borderColor: colors.hairline,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm + spacing.xxs,
      marginBottom: spacing.sm,
      gap: spacing.sm,
      shadowColor: colors.hairlineStrong,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    optionSelected: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
    },
    marker: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.canvasSoft,
    },
    markerSelected: {
      backgroundColor: colors.primary,
    },
    markerText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.muted,
    },
    markerTextSelected: {
      color: colors.onPrimary,
    },
    optionText: {
      flex: 1,
      fontSize: 17,
      fontWeight: '500',
      color: colors.ink,
      lineHeight: 22,
    },
    optionTextSelected: {
      color: colors.ink,
    },
    check: {
      marginLeft: spacing.xs,
    },
  });
}
