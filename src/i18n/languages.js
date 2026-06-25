export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt-BR'];

export const LANGUAGE_OPTIONS = [
  { code: 'en', labelKey: 'language.en', rtl: false },
  { code: 'es', labelKey: 'language.es', rtl: false },
  { code: 'fr', labelKey: 'language.fr', rtl: false },
  { code: 'pt-BR', labelKey: 'language.ptBR', rtl: false },
];

const DEVICE_LOCALE_MAP = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-BR',
};

export const LOCALE_TO_AI_LANGUAGE = {
  en: 'English',
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

export function isRtlLocale() {
  return false;
}

export function getLanguageLabelKey(locale) {
  if (locale === 'pt-BR') return 'language.ptBR';
  return `language.${locale}`;
}

export function getLanguageDisplayLabel(locale, t) {
  const nativeLabel = t(getLanguageLabelKey(locale));
  const englishName = LOCALE_TO_AI_LANGUAGE[locale];
  if (locale === 'es' || locale === 'fr') {
    return `${englishName} · ${nativeLabel}`;
  }
  return nativeLabel;
}
