import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function QuizProgressBar({ current, total }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = total > 0 ? (current / total) * 100 : 0;
  const steps = Array.from({ length: total }, (_, i) => i < current);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Question {current} of {total}</Text>
        <Text style={styles.percent}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.track}>
        {steps.map((done, index) => (
          <View
            key={index}
            style={[styles.segment, done && styles.segmentDone]}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: 13,
      color: colors.muted,
    },
    percent: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    track: {
      flexDirection: 'row',
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 6,
      backgroundColor: colors.hairline,
      borderRadius: borderRadius.pill,
    },
    segmentDone: {
      backgroundColor: colors.primary,
    },
  });
}
