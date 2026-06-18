import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { BADGE_DEFINITIONS, ALL_BADGE_KEYS } from '../utils/quiz';

export default function BadgeGrid({ earnedKeys = [] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const earnedSet = new Set(earnedKeys);

  return (
    <View style={styles.grid}>
      {ALL_BADGE_KEYS.map((key) => {
        const badge = BADGE_DEFINITIONS[key];
        const earned = earnedSet.has(key);
        return (
          <View key={key} style={[styles.badge, earned && styles.badgeEarned]}>
            <Text style={styles.badgeEmoji}>{earned ? badge.emoji : '🔒'}</Text>
            <Text style={[styles.badgeLabel, earned && styles.badgeLabelEarned]}>
              {badge.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badge: {
      width: '30%',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      alignItems: 'center',
    },
    badgeEarned: {
      borderColor: colors.primary,
    },
    badgeEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    badgeLabel: {
      fontSize: 11,
      color: colors.muted,
      textAlign: 'center',
    },
    badgeLabelEarned: {
      color: colors.ink,
      fontWeight: '600',
    },
  });
}
