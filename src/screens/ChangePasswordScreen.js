import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';

export default function ChangePasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { changePassword, loading } = useAuth();
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t('changePassword.missingFields'), t('changePassword.missingFieldsMessage'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('changePassword.weakPassword'), t('changePassword.weakPasswordMessage'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('changePassword.mismatch'), t('changePassword.mismatchMessage'));
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert(t('changePassword.samePassword'), t('changePassword.samePasswordMessage'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await changePassword(currentPassword, newPassword);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('changePassword.failed'), error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('changePassword.successTitle'),
        t('changePassword.successMessage'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    }
  };

  const renderPasswordField = ({
    label,
    value,
    onChangeText,
    show,
    onToggleShow,
    inputRef,
    onSubmitEditing,
    returnKeyType = 'next',
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={label}
          placeholderTextColor={colors.mutedSoft}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
        <TouchableOpacity onPress={onToggleShow} style={styles.eyeButton}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('changePassword.title')}</Text>
          <Text style={styles.subtitle}>{t('changePassword.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          {renderPasswordField({
            label: t('changePassword.current'),
            value: currentPassword,
            onChangeText: setCurrentPassword,
            show: showCurrent,
            onToggleShow: () => setShowCurrent(!showCurrent),
            onSubmitEditing: () => newPasswordRef.current?.focus(),
          })}

          {renderPasswordField({
            label: t('changePassword.new'),
            value: newPassword,
            onChangeText: setNewPassword,
            show: showNew,
            onToggleShow: () => setShowNew(!showNew),
            inputRef: newPasswordRef,
            onSubmitEditing: () => confirmPasswordRef.current?.focus(),
          })}

          {renderPasswordField({
            label: t('changePassword.confirm'),
            value: confirmPassword,
            onChangeText: setConfirmPassword,
            show: showConfirm,
            onToggleShow: () => setShowConfirm(!showConfirm),
            inputRef: confirmPasswordRef,
            onSubmitEditing: handleChangePassword,
            returnKeyType: 'done',
          })}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.submitText}>{t('changePassword.submit')}</Text>
                <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.presets.displayMd,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.presets.bodyMd,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.presets.bodySm,
    fontFamily: typography.fontFamily.sansMedium,
    fontWeight: typography.fontWeights.medium,
    color: colors.body,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontFamily: typography.fontFamily.sans,
    color: colors.ink,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    gap: 10,
    marginTop: spacing.sm,
    height: 48,
  },
  submitText: {
    ...typography.presets.button,
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
  },
  });
}
