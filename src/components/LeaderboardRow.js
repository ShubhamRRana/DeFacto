import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function LeaderboardRow({ rank, name, score, accuracy, isCurrentUser }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, isCurrentUser && styles.rowHighlight]}>
      <Text style={styles.rank}>#{rank}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, isCurrentUser && styles.nameHighlight]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.accuracy}>{accuracy}% accuracy</Text>
      </View>
      <Text style={styles.score}>{score}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineSoft,
    },
    rowHighlight: {
      backgroundColor: colors.canvasSoft,
    },
    rank: {
      width: 36,
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
    },
    info: {
      flex: 1,
      marginHorizontal: spacing.sm,
    },
    name: {
      fontSize: 15,
      color: colors.ink,
    },
    nameHighlight: {
      fontWeight: '600',
      color: colors.primary,
    },
    accuracy: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    score: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.ink,
    },
  });
}
