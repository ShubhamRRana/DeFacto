import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function AddCustomTopicCard({ onPress }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconCircle}>
        <Ionicons name="add" size={28} color={colors.ink} />
      </View>
      <Text style={styles.title}>{t('customTopic.addCardTitle')}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {t('customTopic.addCardDesc')}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    card: {
      alignSelf: 'stretch',
      width: '100%',
      backgroundColor: colors.canvasSoft,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
      borderStyle: 'dashed',
      minHeight: 130,
      marginBottom: spacing.md,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceStrong,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.presets.titleSm,
      fontSize: typography.fontSizes.sm,
      marginBottom: 4,
    },
    desc: {
      ...typography.presets.caption,
      lineHeight: 16,
    },
  });
}
