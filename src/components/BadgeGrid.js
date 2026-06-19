import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { BADGE_DEFINITIONS, ALL_BADGE_KEYS } from '../utils/quiz';

export default function BadgeGrid({ earnedKeys = [], progress = {}, variant = 'default' }) {
  const { colors, typography } = useTheme();
  const isQuiz = variant === 'quiz';
  const styles = useMemo(() => createStyles(colors, typography, isQuiz), [colors, typography, isQuiz]);
  const earnedSet = new Set(earnedKeys);

  return (
    <View style={styles.grid}>
      {ALL_BADGE_KEYS.map((key) => {
        const badge = BADGE_DEFINITIONS[key];
        const earned = earnedSet.has(key);
        const badgeProgress = progress[key];
        const showProgress = isQuiz && !earned && badgeProgress;

        return (
          <View key={key} style={styles.badge}>
            {earned || isQuiz ? (
              <LinearGradient
                colors={['#fbf2d8', '#f3e2b0']}
                style={[styles.iconCircle, !earned && isQuiz && styles.iconCircleDimmed]}
              >
                <Ionicons
                  name={badge.icon}
                  size={20}
                  color={earned ? '#b78f2c' : '#caa334'}
                />
              </LinearGradient>
            ) : (
              <View style={[styles.iconCircle, styles.iconCircleLocked]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
              </View>
            )}
            <Text
              style={[
                styles.badgeLabel,
                earned && !isQuiz && styles.badgeLabelEarned,
                isQuiz && styles.badgeLabelQuiz,
              ]}
              numberOfLines={1}
            >
              {badge.label}
            </Text>
            {showProgress && (
              <Text style={styles.progressLabel}>
                {badgeProgress.current} / {badgeProgress.target}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors, typography, isQuiz) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isQuiz ? 10 : spacing.xs + 2,
    },
    badge: {
      width: isQuiz ? '31%' : '30%',
      backgroundColor: colors.surfaceCard,
      borderRadius: isQuiz ? 16 : borderRadius.xl,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.xxs,
      alignItems: 'center',
      gap: spacing.xxs + 1,
      shadowColor: '#28261f',
      shadowOpacity: isQuiz ? 0.1 : 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleDimmed: {
      opacity: 0.45,
    },
    iconCircleLocked: {
      backgroundColor: colors.hairline,
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
    badgeLabelQuiz: {
      fontFamily: typography.fontFamily.uiMedium,
      color: '#6f6e66',
    },
    progressLabel: {
      fontFamily: typography.fontFamily.uiSemiBold,
      fontSize: 9.5,
      color: '#bf9a36',
    },
  });
}
