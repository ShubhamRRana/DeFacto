import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { withAlpha } from '../utils/color';

const MIN_LENGTH = 2;
const MAX_LENGTH = 50;

export default function AddCustomTopicModal({ visible, onClose, onAdd, saving }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [name, setName] = useState('');

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (trimmed.length < MIN_LENGTH) {
      Alert.alert(t('customTopic.tooShort'), t('customTopic.tooShortMessage', { count: MIN_LENGTH }));
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      Alert.alert(t('customTopic.tooLong'), t('customTopic.tooLongMessage', { count: MAX_LENGTH }));
      return;
    }
    await onAdd(trimmed);
    setName('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t('customTopic.title')}</Text>
          <Text style={styles.hint}>
            {t('customTopic.hint')}
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('customTopic.placeholder')}
            placeholderTextColor={colors.mutedSoft}
            autoFocus
            autoCapitalize="words"
            maxLength={MAX_LENGTH}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            editable={!saving}
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancel} onPress={handleClose} disabled={saving}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.add} onPress={handleAdd} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.addText}>{t('customTopic.add')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: withAlpha(colors.ink, 0.4),
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    title: {
      ...typography.presets.titleMd,
    },
    hint: {
      ...typography.presets.bodySm,
      lineHeight: 20,
    },
    input: {
      backgroundColor: colors.surfaceCard,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      height: 44,
      fontSize: typography.fontSizes.md,
      fontFamily: typography.fontFamily.sans,
      color: colors.ink,
    },
    buttons: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    cancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceCard,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
    },
    cancelText: {
      ...typography.presets.button,
      color: colors.ink,
    },
    add: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    addText: {
      ...typography.presets.button,
      color: colors.onPrimary,
    },
  });
}
