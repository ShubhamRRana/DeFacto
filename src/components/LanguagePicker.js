import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { LANGUAGE_OPTIONS } from '../i18n/languages';

export default function LanguagePicker({
  visible,
  selectedLocale,
  onSelect,
  onClose,
}) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handleSelect = (code) => {
    Haptics.selectionAsync();
    onSelect(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('language.choose')}</Text>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.code === selectedLocale;
            return (
              <TouchableOpacity
                key={option.code}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleSelect(option.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {t(option.labelKey)}
                </Text>
                {selected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.ink + '66',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      ...typography.presets.titleMd,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceStrong,
    },
    optionText: {
      ...typography.presets.bodyMd,
      color: colors.ink,
    },
    optionTextSelected: {
      fontFamily: typography.fontFamily.sansSemiBold,
      fontWeight: typography.fontWeights.semibold,
    },
    cancelButton: {
      marginTop: spacing.sm,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    cancelText: {
      ...typography.presets.bodyMd,
      color: colors.muted,
    },
  });
}
