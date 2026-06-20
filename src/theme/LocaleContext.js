import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { I18nManager, Alert, DevSettings } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import i18n from '../i18n';
import {
  DEFAULT_LOCALE,
  isRtlLocale,
  isSupportedLocale,
  resolveDeviceLocale,
} from '../i18n/languages';

const LOCALE_KEY = 'defacto_locale';

const LocaleContext = createContext(null);

async function applyRtlIfNeeded(locale, previousLocale) {
  const shouldRtl = isRtlLocale(locale);
  const wasRtl = isRtlLocale(previousLocale);
  if (shouldRtl === wasRtl) return false;

  I18nManager.allowRTL(shouldRtl);
  I18nManager.forceRTL(shouldRtl);
  return true;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(LOCALE_KEY);
      const initial = isSupportedLocale(saved) ? saved : resolveDeviceLocale();
      if (isRtlLocale(initial)) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      }
      await i18n.changeLanguage(initial);
      setLocaleState(initial);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (next, { reloadOnRtlChange = true } = {}) => {
    if (!isSupportedLocale(next)) return;
    const previous = locale;
    await i18n.changeLanguage(next);
    setLocaleState(next);
    await SecureStore.setItemAsync(LOCALE_KEY, next);

    const needsReload = reloadOnRtlChange && await applyRtlIfNeeded(next, previous);
    if (needsReload) {
      Alert.alert(
        i18n.t('language.restartTitle'),
        i18n.t('language.restartMessage'),
        [{ text: i18n.t('common.ok') }],
      );
      if (__DEV__ && DevSettings.reload) {
        DevSettings.reload();
      }
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      isRtl: isRtlLocale(locale),
      setLocale,
      ready,
    }),
    [locale, setLocale, ready],
  );

  if (!ready) {
    return null;
  }

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
