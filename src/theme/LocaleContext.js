import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import i18n from '../i18n';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  resolveDeviceLocale,
} from '../i18n/languages';

const LOCALE_KEY = 'defacto_locale';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(LOCALE_KEY);
      const initial = isSupportedLocale(saved) ? saved : resolveDeviceLocale();
      await i18n.changeLanguage(initial);
      setLocaleState(initial);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (next) => {
    if (!isSupportedLocale(next)) return;
    await i18n.changeLanguage(next);
    setLocaleState(next);
    await SecureStore.setItemAsync(LOCALE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      isRtl: false,
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
