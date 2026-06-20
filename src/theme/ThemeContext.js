import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { lightColors, darkColors } from './palettes';
import { getTypography, spacing, borderRadius } from './colors';
import { useLocale } from './LocaleContext';

const THEME_KEY = 'defacto_theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { locale } = useLocale();
  const [mode, setModeState] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved);
      }
      setReady(true);
    });
  }, []);

  const setTheme = useCallback(async (next) => {
    if (next !== 'light' && next !== 'dark') return;
    setModeState(next);
    await SecureStore.setItemAsync(THEME_KEY, next);
  }, []);

  const toggleTheme = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = mode === 'light' ? 'dark' : 'light';
    setModeState(next);
    await SecureStore.setItemAsync(THEME_KEY, next);
  }, [mode]);

  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const isArabic = locale === 'ar';
  const typography = useMemo(
    () => getTypography(colors, { isArabic }),
    [colors, isArabic],
  );

  const value = useMemo(
    () => ({
      mode,
      isDark,
      colors,
      typography,
      spacing,
      borderRadius,
      toggleTheme,
      setTheme,
      ready,
    }),
    [mode, isDark, colors, typography, toggleTheme, setTheme, ready],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
