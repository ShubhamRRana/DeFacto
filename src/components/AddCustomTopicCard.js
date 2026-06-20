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
      <Text style={styles.title} numberOfLines={1}>
        {t('customTopic.addCardTitle')}
      </Text>
      <View style={styles.addButton}>
        <Ionicons name="add" size={20} color={colors.ink} />
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
      width: '100%',
      backgroundColor: colors.canvasSoft,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
      borderStyle: 'dashed',
    },
    title: {
      ...typography.presets.bodyMd,
      flex: 1,
      marginRight: spacing.sm,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceStrong,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
