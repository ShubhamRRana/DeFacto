export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = ['en', 'ar', 'es', 'fr', 'pt-BR'];

export const LANGUAGE_OPTIONS = [
  { code: 'en', labelKey: 'language.en', rtl: false },
  { code: 'ar', labelKey: 'language.ar', rtl: true },
  { code: 'es', labelKey: 'language.es', rtl: false },
  { code: 'fr', labelKey: 'language.fr', rtl: false },
  { code: 'pt-BR', labelKey: 'language.ptBR', rtl: false },
];

const DEVICE_LOCALE_MAP = {
  en: 'en',
  ar: 'ar',
  es: 'es',
  fr: 'fr',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-BR',
};

export const LOCALE_TO_AI_LANGUAGE = {
  en: 'English',
  ar: 'Modern Standard Arabic',
  es: 'Spanish',
  fr: 'French',
  'pt-BR': 'Brazilian Portuguese',
};

export function isSupportedLocale(code) {
  return SUPPORTED_LOCALES.includes(code);
}

export function resolveDeviceLocale() {
  try {
    const Localization = require('expo-localization');
    const tag = Localization.getLocales?.()?.[0]?.languageTag
      ?? Localization.locale
      ?? 'en';
    const normalized = tag.toLowerCase();
    if (DEVICE_LOCALE_MAP[normalized]) {
      return DEVICE_LOCALE_MAP[normalized];
    }
    const base = normalized.split('-')[0];
    return DEVICE_LOCALE_MAP[base] ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function isRtlLocale(locale) {
  return locale === 'ar';
}

export function getLanguageLabelKey(locale) {
  if (locale === 'pt-BR') return 'language.ptBR';
  return `language.${locale}`;
}
