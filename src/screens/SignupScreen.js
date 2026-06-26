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
import { useLocale } from '../theme/LocaleContext';
import { spacing, borderRadius } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import LanguagePicker from '../components/LanguagePicker';
import { getLanguageLabelKey } from '../i18n/languages';

export default function SignupScreen({ navigation }) {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const { locale, setLocale } = useLocale();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const { signUp, loading } = useAuth();

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleLanguageSelect = async (code) => {
    await setLocale(code, { reloadOnRtlChange: true });
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('auth.signup.missingFields'), t('auth.signup.missingFieldsMessage'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.signup.weakPassword'), t('auth.signup.weakPasswordMessage'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signUp(email.trim(), password, fullName.trim(), locale);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('auth.signup.failed'), String(error));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('auth.signup.successTitle'),
        t('auth.signup.successMessage'),
        [{ text: t('auth.signup.goToSignIn'), onPress: () => navigation.navigate('Login') }]
      );
    }
  };

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
            <Ionicons name="flash" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('auth.signup.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.signup.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('common.fullName')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.signup.namePlaceholder')}
                placeholderTextColor={colors.mutedSoft}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('language.label')}</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowLanguagePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="language-outline" size={18} color={colors.muted} style={styles.inputIcon} />
              <Text style={styles.input}>{t(getLanguageLabelKey(locale))}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('common.email')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedSoft}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('common.password')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder={t('auth.signup.passwordPlaceholder')}
                placeholderTextColor={colors.mutedSoft}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {password.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={[styles.strengthBar, { backgroundColor: password.length >= 6 ? colors.success : colors.error }]} />
              <Text style={[styles.strengthText, { color: password.length >= 6 ? colors.success : colors.error }]}>
                {password.length >= 10
                  ? t('auth.signup.passwordStrong')
                  : password.length >= 6
                    ? t('auth.signup.passwordGood')
                    : t('auth.signup.passwordShort')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.submitText}>{t('auth.signup.submit')}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.footerText}>
            {t('auth.signup.alreadyHaveAccount')}{' '}
            <Text style={styles.footerHighlight}>{t('auth.signup.signIn')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <LanguagePicker
        visible={showLanguagePicker}
        selectedLocale={locale}
        onSelect={handleLanguageSelect}
        onClose={() => setShowLanguagePicker(false)}
      />
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
    marginBottom: spacing.xl,
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
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  strengthBar: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: typography.fontFamily.sans,
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
  footerLink: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  footerText: {
    ...typography.presets.bodyMd,
  },
  footerHighlight: {
    color: colors.ink,
    fontFamily: typography.fontFamily.sansSemiBold,
    fontWeight: typography.fontWeights.semibold,
  },
  });
}
